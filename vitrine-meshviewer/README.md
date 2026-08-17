# fracsys-vitrine

### French
Petite page web pour présenter l'avancement du projet FracSYS.

#### Infrastructure AWS
Pour plus d'informations sur l'infrastructure AWS et son déploiement, consultez la [documentation de déploiement AWS](docu/AWS_DEPLOYMENT_FR.md).

#### Déploiement
L'application doit être déployée sur un serveur web. Un fichier docker-compose est disponible pour faciliter le développement sans serveur.
Installez Docker (ou podman) et exécutez
```
docker compose up -d
```

#### Utilisation
Une fois l'application lancée, vous pouvez :

**Chargement des modèles :**
- Cliquez sur les boutons en haut à droite pour charger différents modèles 3D :
  - **Damage Zone** : Modèle de zone d'endommagement
  - **Optimized Damage Zone** : Version optimisée (travail en cours)
  - **Fracture Zone** : Modèle de zone de fracture

**Contrôles de navigation 3D :**
- **Bouton gauche de la souris** : Rotation de la vue autour du modèle
- **Shift + Bouton gauche** : Rotation sur l'axe Z
- **Bouton droit de la souris** : Déplacement de la vue (pan)
- **Molette de la souris** : Zoom avant/arrière

#### Infrastructure AWS avec CDK

Le projet inclut une infrastructure AWS pour stocker et servir des modèles 3D via des URLs signées.

**Architecture :**
- **Bucket S3** : Stockage privé pour les modèles 3D
- **Lambda Functions** : Génération d'URLs signées pour l'upload et le téléchargement
- **API Gateway** : Endpoints REST pour accéder aux fonctions Lambda

**Prérequis :**
- Python 3.12+
- AWS CLI configuré avec vos credentials
- AWS CDK CLI : `npm install -g aws-cdk`

**Installation :**
```bash
cd aws-infrastructure
python -m venv .venv
source .venv/bin/activate  # Sur Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Déploiement :**
```bash
# Première fois uniquement : bootstrap CDK dans votre compte AWS
cdk bootstrap

# Déployer la stack
cdk deploy
```

**Endpoints disponibles :**
- `GET /download-url?key=path/to/model.glb&expires=60` - Génère une URL signée pour télécharger un modèle
- `GET /upload-url?key=path/to/model.glb&contentType=model/gltf-binary&expires=60` - Génère une URL signée pour uploader un modèle

Les URLs signées expirent après 60 secondes par défaut.

**Tests :**
```bash
cd aws-infrastructure
python -m pytest tests/
```

### English
Small webpage to demonstrate the progress of the FracSYS project.

#### AWS Infrastructure
For more information about the AWS infrastructure and deployment, see the [AWS deployment documentation](docu/AWS_DEPLOYMENT.md).

#### Deployment
The app must be deployed on a webserver. There is a docker-compose file for easier development without a server.
Install Docker (or podman) and run
```
docker compose up -d
```

#### Usage
Once the application is running, you can:

**Loading Models:**
- Click the buttons in the top-right corner to load different 3D models:
  - **Damage Zone**: Damage zone model
  - **Optimized Damage Zone**: Optimized version (work in progress)
  - **Fracture Zone**: Fracture zone model

**3D Navigation Controls:**
- **Left mouse button**: Rotate the view around the model
- **Shift + Left button**: Rotate on Z-axis
- **Right mouse button**: Pan the view
- **Mouse wheel**: Zoom in/out

#### AWS Infrastructure with CDK

The project includes AWS infrastructure for storing and serving 3D models via signed URLs.

**Architecture:**
- **S3 Bucket**: Private storage for 3D models
- **Lambda Functions**: Generate signed URLs for upload and download operations
- **API Gateway**: REST endpoints to access Lambda functions

**Prerequisites:**
- Python 3.12+
- AWS CLI configured with your credentials
- AWS CDK CLI: `npm install -g aws-cdk`

**Installation:**
```bash
cd aws-infrastructure
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Deployment:**
```bash
# First time only: bootstrap CDK in your AWS account
cdk bootstrap

# Deploy the stack
cdk deploy
```

**Available Endpoints:**
- `GET /download-url?key=path/to/model.glb&expires=60` - Generates a signed URL to download a model
- `GET /upload-url?key=path/to/model.glb&contentType=model/gltf-binary&expires=60` - Generates a signed URL to upload a model

Signed URLs expire after 60 seconds by default.

**Testing:**
```bash
cd aws-infrastructure
python -m pytest tests/
```



