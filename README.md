# FracSYS Vitrine

FracSYS Vitrine brings together two browser-based 3D applications for exploring FracSYS models and flow results. Each project is self-contained and can be developed or deployed independently.

## Projects

| Project | Description | Main technologies |
| --- | --- | --- |
| [`vitrine-meshviewer`](./vitrine-meshviewer/) | Interactive viewer for fracture- and damage-zone meshes. It supports multiple layers, local VTP uploads, AWS S3 downloads, cell metadata, surface/wireframe rendering, and hydraulic-head colour mapping. The project also contains optional AWS CDK infrastructure for private model storage and signed upload/download URLs. | TypeScript, VTK.js, Vite, AWS CDK, Docker/Apache |
| [`vitrine-flowviewer`](./vitrine-flowviewer/) | Interactive particle-flow simulation through a porous voxel grid. It visualizes permeability, pooling, inlet flow, and exits, and can load custom voxel grids from CSV files. | TypeScript, Three.js, Vite, Docker/nginx |

## Prerequisites

- Node.js 18 or later
- npm
- Docker or Podman (optional)
- Python 3.12+, AWS CLI, and AWS CDK CLI (only for the mesh viewer's AWS infrastructure)

## Quick start

Clone the repository, then run either application from its own directory.

### Mesh viewer

```bash
cd vitrine-meshviewer
npm install
npm run dev
```

Open <http://localhost:3000>.

To create and serve a production build with Docker:

```bash
npm run build
docker compose up -d
```

The Docker deployment is available at <http://localhost:8080>.

See the [mesh viewer documentation](./vitrine-meshviewer/README.md) for controls and the [AWS deployment guide](./vitrine-meshviewer/docu/AWS_DEPLOYMENT.md) for cloud infrastructure setup.

### Flow viewer

```bash
cd vitrine-flowviewer
npm install
npm run dev
```

Open the URL printed by Vite, normally <http://localhost:5173>.

To build and run the production container:

```bash
docker compose up --build
```

The Docker deployment is available at <http://localhost:8080>.

The viewer uses a generated sample grid when no default CSV is present. To use project data, place a CSV in `vitrine-flowviewer/public/data/` or load one through the application. See the [flow viewer documentation](./vitrine-flowviewer/README.md) for the CSV format, simulation behavior, and controls.

> Both Docker configurations use host port `8080` by default. Run one at a time or change one of the port mappings if you want to run both simultaneously.

## Repository structure

```text
fracsys-vitrine/
├── vitrine-meshviewer/   # Mesh visualization app and AWS infrastructure
└── vitrine-flowviewer/   # Voxel-grid particle-flow simulator
```

## Production builds

```bash
cd vitrine-meshviewer
npm install
npm run build

cd ../vitrine-flowviewer
npm install
npm run build
```

Build output is generated in each application's `dist/` directory.

---

# FracSYS Vitrine — Français

FracSYS Vitrine rassemble deux applications 3D accessibles dans un navigateur pour explorer les modèles et les résultats d'écoulement FracSYS. Chaque projet est autonome et peut être développé ou déployé indépendamment.

## Projets

| Projet | Description | Technologies principales |
| --- | --- | --- |
| [`vitrine-meshviewer`](./vitrine-meshviewer/) | Visionneuse interactive de maillages de zones de fracture et d'endommagement. Elle prend en charge plusieurs couches, l'importation locale de fichiers VTP, le téléchargement depuis AWS S3, les métadonnées des cellules, le rendu en surface ou en fil de fer et la représentation colorée de la charge hydraulique. Le projet contient également une infrastructure AWS CDK facultative pour le stockage privé des modèles et la génération d'URL signées de téléversement et de téléchargement. | TypeScript, VTK.js, Vite, AWS CDK, Docker/Apache |
| [`vitrine-flowviewer`](./vitrine-flowviewer/) | Simulation interactive de l'écoulement de particules dans une grille de voxels poreux. Elle permet de visualiser la perméabilité, l'accumulation, l'écoulement entrant et les sorties, ainsi que de charger des grilles de voxels personnalisées à partir de fichiers CSV. | TypeScript, Three.js, Vite, Docker/nginx |

## Prérequis

- Node.js 18 ou version ultérieure
- npm
- Docker ou Podman (facultatif)
- Python 3.12 ou version ultérieure, AWS CLI et AWS CDK CLI (uniquement pour l'infrastructure AWS de la visionneuse de maillages)

## Démarrage rapide

Clonez le dépôt, puis lancez l'une des applications depuis son propre répertoire.

### Visionneuse de maillages

```bash
cd vitrine-meshviewer
npm install
npm run dev
```

Ouvrez <http://localhost:3000>.

Pour créer une version de production et la servir avec Docker :

```bash
npm run build
docker compose up -d
```

Le déploiement Docker est accessible à l'adresse <http://localhost:8080>.

Consultez la [documentation de la visionneuse de maillages](./vitrine-meshviewer/README.md) pour connaître les commandes, et le [guide de déploiement AWS](./vitrine-meshviewer/docu/AWS_DEPLOYMENT_FR.md) pour configurer l'infrastructure cloud.

### Visionneuse d'écoulement

```bash
cd vitrine-flowviewer
npm install
npm run dev
```

Ouvrez l'URL affichée par Vite, généralement <http://localhost:5173>.

Pour construire et lancer le conteneur de production :

```bash
docker compose up --build
```

Le déploiement Docker est accessible à l'adresse <http://localhost:8080>.

La visionneuse utilise une grille d'exemple générée lorsqu'aucun fichier CSV par défaut n'est disponible. Pour utiliser les données du projet, placez un fichier CSV dans `vitrine-flowviewer/public/data/` ou chargez-en un depuis l'application. Consultez la [documentation de la visionneuse d'écoulement](./vitrine-flowviewer/README.md) pour connaître le format CSV, le fonctionnement de la simulation et les commandes.

> Les deux configurations Docker utilisent par défaut le port hôte `8080`. Lancez une seule application à la fois ou modifiez l'une des correspondances de ports pour exécuter les deux simultanément.

## Structure du dépôt

```text
fracsys-vitrine/
├── vitrine-meshviewer/   # Application de visualisation des maillages et infrastructure AWS
└── vitrine-flowviewer/   # Simulateur d'écoulement de particules sur une grille de voxels
```

## Versions de production

```bash
cd vitrine-meshviewer
npm install
npm run build

cd ../vitrine-flowviewer
npm install
npm run build
```

Les fichiers générés sont placés dans le répertoire `dist/` de chaque application.
