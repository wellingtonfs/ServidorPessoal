import mediapipe as mp
import torch, math
import numpy as np
import os, sys
import cv2

import matplotlib.pyplot as plt

from skimage.transform import rotate, resize
from skimage.io import imsave
from skimage import img_as_ubyte

from typing import Union

from fastapi import FastAPI
from pydantic import BaseModel

import dotenv, warnings
import uvicorn

dotenv.load_dotenv()

def imshow(img):
    if img.max() > 1.0:
        img = img / 255.0

    if type(img) == np.ndarray:
        if len(img.shape) == 3:
            plt.imshow(img)
            plt.show()
        else:
            plt.imshow(img, cmap='gray')
            plt.show()
    else:
        with torch.no_grad():
            img = img.clone()
            img = img.to("cpu")

            if img.min() < 0.0: # "des"normalizar
                img = img / 2 + 0.5 # img * std + med,

            npimg = img.detach().numpy()
            if len(npimg.shape) == 3:
                plt.imshow(np.transpose(npimg, (1, 2, 0)))
                plt.show()
            else:
                plt.imshow(npimg, cmap='gray')
                plt.show()

def desnormalize(img):
    out = img / 2 + 0.5
    return out.clamp_(0.0, 1.0) # img * std + med,

def save_img(matriz, path_to):
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore")

        if type(matriz) != np.ndarray:
            with torch.no_grad():
                img = matriz.clone()
                img = img.to("cpu")

                if img.min() < 0.0: # "des"normalizar
                    img = desnormalize(img)

                npimg = img.detach().numpy()
                if len(npimg.shape) == 3:
                    imsave(path_to, img_as_ubyte(np.transpose(npimg, (1, 2, 0))))
                else:
                    imsave(path_to, img_as_ubyte(npimg))

                return

        imsave(path_to, img_as_ubyte(matriz))

#converte um ponto x, y de uma dimenção de imagem para outra
def convert_point_to_dim(ponto, from_size, to_size):
    xx = int((ponto[0] / float(from_size[0])) * to_size[0])
    yy = int((ponto[1] / float(from_size[1])) * to_size[1])

    xx = xx if xx < to_size[0] else to_size[0] - 1
    yy = yy if yy < to_size[1] else to_size[1] - 1
    x = xx if xx >= 0 else 0
    y = yy if yy >= 0 else 0
    return x, y

def convert_to_dim(ponto, from_size, to_size):
    if from_size[0] == 1920:
        ponto = [ponto[0], ponto[1]]
        ponto[0] = (ponto[0] - 448).clamp(0, 1024)
        ponto[1] = (ponto[1] - 56).clamp(0, 1024)

        return convert_point_to_dim(ponto, (1024, 1024), to_size)
    elif from_size[0] == 1024:
        ponto = [ponto[0], ponto[1]]
        ponto[0] = (ponto[0] - 256).clamp(0, 512)

        return convert_point_to_dim(ponto, (512, 512), to_size)

    return convert_point_to_dim(ponto, from_size, to_size)

def make_gauss(img2d, center=(32,32), amplitude=1.0, std=(1.0,1.0)):
    varX, varY = std
    cX, cY = center
    A = amplitude
    coe1 = torch.tensor(float(2*varX))
    coe2 = float(2*varY)

    def pixel_value(x, y):
        #res = torch.exp(torch.tensor(-1* (((x-cX)**2/float(2*varX)) + ((y-cY)**2/float(2*varY))))) * A
        res = torch.exp(-1* (((x-cX)**2/coe1) + ((y-cY)**2/coe2))) * A
        return res

    for i in range(img2d.shape[0]):
        for j in range(img2d.shape[1]):
            img2d[i,j] = pixel_value(j, i) #invertido para que funcione corretamente o eixo x e y

#essa classe gera uma lista de camadas de gaussianas de forma mais rapida
class PosesGenerator:
    def __init__(self, size_img=(), tam_gauss=[32, 64], tam_original_pose=(260, 260)):
        assert len(size_img) == 2 and len(tam_gauss) == 2
        self.tamanho_gauss = tam_gauss
        self.size_img = size_img
        self.tam_gauss = list(tam_gauss)
        self.c = 0.005
        self.cc = 1e-12

        self.tam_original_pose = tam_original_pose

        self.infos_to_make = {
            "pose": {
                "corpo": (0, 1, 8), "right": (2, 3, 4), "left": (5, 6, 7)},
            "face": [40, 41, 46, 47, 62, 66, 68, 69],
            "hand": [4, 8, 12, 16, 20]
        }

        num_to_par = 10 if tam_gauss[0] % 2 == 0 else 11
        self.tam_gauss[0] += num_to_par

        #gerar uma gaussiana menor
        self.gauss = torch.zeros(self.tam_gauss[0], self.tam_gauss[0])
        make_gauss(
            self.gauss,
            center=(self.tam_gauss[0]//2,self.tam_gauss[0]//2),
            amplitude=1,
            std=(
                self.tam_gauss[0]-num_to_par,
                self.tam_gauss[0]-num_to_par
            )
        )

        num_to_par = 6 if tam_gauss[1] % 2 == 0 else 7
        self.tam_gauss[1] += num_to_par

        #gerar uma gaussiana maior
        self.gauss_maior = torch.zeros(self.tam_gauss[1], self.tam_gauss[1])

        make_gauss(
            self.gauss_maior,
            center=(self.tam_gauss[1]//2, self.tam_gauss[1]//2),
            amplitude=1,
            std=(self.tam_gauss[1]-num_to_par, self.tam_gauss[1]-num_to_par)
        )

        self.tam_mask = 48 if self.size_img == 64 else 160

        #gaussiana para gerar os membros
        self.gauss_espichado = torch.zeros(self.tam_mask, self.tam_mask)
        make_gauss(
            self.gauss_espichado, center=(self.tam_mask//2, self.tam_mask//2), amplitude=1,
            std=(650 if self.tam_mask == 160 else 64, self.tamanho_gauss[1])
        )

    def __make_gauss_list(self, list_center, maior=False):
        assert len(list_center) > 0

        itr = 1 if maior else 0

        #criar imagem de saida
        img_full = torch.zeros(self.size_img[0]+self.tam_gauss[itr], self.size_img[1]+self.tam_gauss[itr])

        #rodar todos os pontos que deve ter uma gaussiana
        for ponto in list_center:
            x, y = ponto

            #como img_full é maior que a imagem de saida, temos que fixar o ponto 0,0 da imagem menor com
            #a compensação da imagem maior
            center = (x + self.tam_gauss[itr]//2, y + self.tam_gauss[itr]//2)

            xi, xf = center[0] - self.tam_gauss[itr]//2, center[0] + self.tam_gauss[itr]//2
            yi, yf = center[1] - self.tam_gauss[itr]//2, center[1] + self.tam_gauss[itr]//2

            img_full[xi:xf, yi:yf] += self.gauss_maior if maior else self.gauss

        return torch.transpose(
            img_full[self.tam_gauss[itr]//2:-self.tam_gauss[itr]//2, self.tam_gauss[itr]//2:-self.tam_gauss[itr]//2],
                1, 0)

    def get_preenchimento(self, ponto1, ponto2):
        ponto1 = ponto1.tolist() if type(ponto1) == torch.Tensor else ponto1
        ponto2 = ponto2.tolist() if type(ponto2) == torch.Tensor else ponto2

        def dist(p1=(), p2=()):
            return math.sqrt( (p2[0]-p1[0])**2 + (p2[1] - p1[1])**2 )

        out = torch.zeros(self.size_img[0]+self.tam_mask, self.size_img[1]+self.tam_mask)

        std_x = int(dist((ponto1[0], ponto1[1]), (ponto2[0], ponto2[1])) * 1.8)
        std_x = std_x if std_x % 2 == 0 else std_x + 1
        std_x = self.tam_mask if std_x > self.tam_mask else std_x
        std_x = 2 if std_x < 2 else std_x

        cx = (abs(ponto1[0]+ponto2[0]) // 2) + (self.tam_mask // 2)
        cy = (abs(ponto1[1]+ponto2[1]) // 2) + (self.tam_mask // 2)

        ang = math.atan(
            (ponto2[1]-ponto1[1]) / (ponto2[0]-ponto1[0])
        ) * 180/math.pi if (ponto2[0]-ponto1[0]) != 0 else 90

        cx = cx.item() if type(cx) == torch.Tensor else cx
        cy = cy.item() if type(cy) == torch.Tensor else cy

        es = torch.from_numpy(resize(self.gauss_espichado.numpy(), (self.tam_mask, std_x)))

        out[cy-(self.tam_mask // 2) : cy+(self.tam_mask // 2), cx - es.size(1)//2 : cx + es.size(1)//2] = es

        out = out[(self.tam_mask // 2):-(self.tam_mask // 2), (self.tam_mask // 2):-(self.tam_mask // 2)]

        return torch.from_numpy(rotate(out.numpy(), ang*-1, center=(cx-(self.tam_mask // 2), cy-(self.tam_mask // 2))))

    #essa função auxilia na função make_pose
    #dado uma lista de pontos, gera uma saida de pontos gaussiano representando a pose
    def __make_matriz_from_points(self, lista_pontos, tipo, tam_orig_pose):
        tam_orig_pose = self.tam_original_pose if tam_orig_pose is None else tam_orig_pose
        local_pose = torch.zeros(1, *self.size_img)
        all_pontos = torch.tensor(lista_pontos).view(-1, 3)

        if tipo == "pose":
            for key in self.infos_to_make["pose"]:
                i, j, k = self.infos_to_make["pose"][key]

                if all_pontos[i][2] >= self.c:
                    p1 = convert_to_dim(all_pontos[i][:2], tam_orig_pose, self.size_img)
                    local_pose[-1] = self.__make_gauss_list([p1], maior=False)
                local_pose = torch.cat([local_pose, local_pose[-1:]], dim=0)

                if all_pontos[j][2] >= self.c:
                    p2 = convert_to_dim(all_pontos[j][:2], tam_orig_pose, self.size_img)
                    local_pose[-1] = self.__make_gauss_list([p2], maior=False)
                local_pose = torch.cat([local_pose, local_pose[-1:]], dim=0)

                if all_pontos[k][2] >= (self.c if k != 8 else self.cc):
                    p3 = convert_to_dim(all_pontos[k][:2], tam_orig_pose, self.size_img)
                    local_pose[-1] = self.__make_gauss_list([p3], maior=False)
                local_pose = torch.cat([local_pose, local_pose[-1:]], dim=0)

            for key in self.infos_to_make["pose"]:
                i, j, k = self.infos_to_make["pose"][key]

                p1 = convert_to_dim(all_pontos[i][:2], tam_orig_pose, self.size_img)
                p2 = convert_to_dim(all_pontos[j][:2], tam_orig_pose, self.size_img)
                p3 = convert_to_dim(all_pontos[k][:2], tam_orig_pose, self.size_img)

                if all_pontos[j][2] >= self.c:
                    if all_pontos[i][2] >= self.c and all_pontos[k][2] >= (self.c if k != 8 else self.cc):
                        local_pose[-1] = self.get_preenchimento(p1, p2)
                        local_pose[-1] += self.get_preenchimento(p2, p3)
                    elif all_pontos[i][2] >= self.c:
                        local_pose[-1] = self.get_preenchimento(p1, p2)
                    else:
                        local_pose[-1] = self.get_preenchimento(p2, p3)
                else:
                    local_pose[-1].fill_(0)

                local_pose = torch.cat([local_pose, local_pose[-1:]], dim=0)

            return local_pose[:-1]

        for p in self.infos_to_make[tipo]:
            if all_pontos[p][2] < self.c:
                local_pose[-1].fill_(0)
                local_pose = torch.cat([local_pose, local_pose[-1:]], dim=0)
                continue

            local_pose[-1] = self.__make_gauss_list([
                convert_to_dim(
                    (all_pontos[p][0], all_pontos[p][1]), tam_orig_pose, self.size_img
            )], maior=False)

            local_pose = torch.cat([local_pose, local_pose[-1:]], dim=0)

        return local_pose[:-1]

    def make(self, infos_json, tam_original_pose=None):
        pose = torch.zeros(1, *self.size_img)
        face = torch.zeros(1, *self.size_img)
        hand = torch.zeros(1, *self.size_img)

        for k in infos_json['people'][0]:
            if k == 'person_id' or '3d' in k:
                continue

            if "pose" in k:
                m = self.__make_matriz_from_points(infos_json['people'][0][k], "pose", tam_original_pose)
                pose = torch.cat([pose, m], dim=0)
            elif "face" in k:
                m = self.__make_matriz_from_points(infos_json['people'][0][k], "face", tam_original_pose)
                face = torch.cat([face, m], dim=0)
            elif "hand" in k:
                m = self.__make_matriz_from_points(infos_json['people'][0][k], "hand", tam_original_pose)
                hand = torch.cat([hand, m], dim=0)

        label = torch.cat([pose[1:], face[1:], hand[1:]], dim=0)

        return label.clamp_(0.0, 1.0)
    
# Inicialize os detectores de mãos, pose e face mesh

mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose
mp_face_mesh = mp.solutions.face_mesh

hands_detector = mp_hands.Hands(static_image_mode=True)
pose_detector = mp_pose.Pose(static_image_mode=True)
face_mesh_detector = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1)

pose_gen = PosesGenerator((256, 256), tam_original_pose=(256, 256))

# Servidor

class Item(BaseModel):
    path: str

app = FastAPI()

@app.post("/")
async def upload_item(item: Item):
    global pose_gen

    try:
        # Carregue a imagem de 256x256 pixels
        image = cv2.imread(item.path)
        height, width, _ = (256, 256, 3)

        # Detecte mãos, pose e face mesh
        hands_results = hands_detector.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        pose_results = pose_detector.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        face_mesh_results = face_mesh_detector.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        # Mapeie os pontos de pose do MediaPipe para o formato do OpenPose

        try:
            pose_keypoints = []

            for landmark in pose_results.pose_landmarks.landmark:
                pose_keypoints.append([min(landmark.x * width, width - 1), min(landmark.y * height, height - 1), 1])

            pose_conv = []
            pose_conv.extend(pose_keypoints[0])
            pose_conv.extend([(pose_keypoints[11][0] + pose_keypoints[12][0]) / 2, (pose_keypoints[11][1] + pose_keypoints[12][1]) / 2, 1])
            pose_conv.extend(pose_keypoints[12])
            pose_conv.extend(pose_keypoints[14])
            pose_conv.extend(pose_keypoints[16])
            pose_conv.extend(pose_keypoints[11])
            pose_conv.extend(pose_keypoints[13])
            pose_conv.extend(pose_keypoints[15])
            pose_conv.extend([(pose_keypoints[23][0] + pose_keypoints[24][0]) / 2, (pose_keypoints[23][1] + pose_keypoints[24][1]) / 2, 1])
            pose_conv.extend([0] * (16 * 3))
        except:
            pose_conv = [0] * 75

        # face

        try:
            face_keypoints = []

            for landmark in face_mesh_results.multi_face_landmarks[0].landmark:
                face_keypoints.append([min(landmark.x * width, width - 1), min(landmark.y * height, height - 1), 1])

            face_conv = [0] * (40 * 3)
            face_conv.extend(face_keypoints[22])
            face_conv.extend(face_keypoints[24])
            face_conv.extend([0] * (4 * 3))
            face_conv.extend(face_keypoints[254])
            face_conv.extend(face_keypoints[252])
            face_conv.extend([0] * (14 * 3))
            face_conv.extend(face_keypoints[13])
            face_conv.extend([0] * (3 * 3))
            face_conv.extend(face_keypoints[15])
            face_conv.extend([0] * (1 * 3))
            face_conv.extend([(face_keypoints[145][0] + face_keypoints[159][0]) / 2, (face_keypoints[145][1] + face_keypoints[159][1]) / 2, 1])
            face_conv.extend([(face_keypoints[374][0] + face_keypoints[386][0]) / 2, (face_keypoints[374][1] + face_keypoints[386][1]) / 2, 1])
        except:
            face_conv = [0] * 210

        # hand left

        try:
            hand_left_conv = []

            for landmark in hands_results.multi_hand_landmarks[0].landmark:
                hand_left_conv.append([min(landmark.x * width, width - 1), min(landmark.y * height, height - 1), 1])

        except:
            hand_left_conv = [0] * 63

        # hand right

        try:
            hand_right_conv = []

            for landmark in hands_results.multi_hand_landmarks[1].landmark:
                hand_right_conv.append([min(landmark.x * width, width - 1), min(landmark.y * height, height - 1), 1])

        except:
            hand_right_conv = [0] * 63

        # Crie um JSON com todos os pontos no formato do OpenPose

        openpose_json = {
            "version": 1.0,
            "people": [
                {
                    "pose_keypoints_2d": pose_conv,
                    "face_keypoints_2d": face_conv,
                    "hand_left_keypoints_2d": hand_left_conv,
                    "hand_right_keypoints_2d": hand_right_conv
                }
            ]
        }

        pose = pose_gen.make(openpose_json)

        pose[ pose < 0.015 ] = 0

        pasta = os.path.join(os.getenv("DIR_USER_DATA"), "openpose")

        if not os.path.isdir(pasta):
            os.makedirs(pasta)

        for ip in range(0, 30, 3):
            save_img(pose[ip:ip+3], os.path.join(pasta, f"{ip}.png"))
    
    except Exception as error:
        return { "error": error }

    return { "ok": True }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")