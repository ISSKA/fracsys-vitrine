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



