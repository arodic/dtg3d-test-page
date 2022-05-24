import { IoElement, RegisterIoElement } from 'io-gui';
import { ThreeViewport } from 'io-gui-three-ui';
import { Mesh, Vector2, RepeatWrapping, TextureLoader } from 'three';
import { GarmentMaterial } from './materials/GarmentMaterial.js';
import { PrintArea } from './PrintArea.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { SelectionControls } from './controls/SelectionControls.js';
import { CameraControls } from './controls/CameraControls.js';
const textureLoader = new TextureLoader();
export class StagedEditor extends IoElement {
    static get Style() {
        return /* css */ `
      :host {
        display: flex;
        position: relative;
        height: 100%;
        flex-direction: column;
        overflow: hidden;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      :host > three-viewport {
        flex: 1 1 auto;
      }
    `;
    }
    static get Properties() {
        return {
            selectedPrintArea: null,
            selectedGraphic: null
        };
    }
    static get Listeners() {
        return {
            'drop': 'onDrop',
            'dragover': 'onDragover',
            'click': 'onClick'
        };
    }
    sceneSpec;
    garmentMeshes = [];
    viewport = new ThreeViewport();
    bokehPass;
    constructor(properties = {}) {
        super(properties);
        this.appendChild(this.viewport);
        this.viewport.cameraControls = new CameraControls(this.viewport.camera, this.viewport);
        // this.viewport.cameraControls.minPolarAngle = Math.PI / 8;
        // this.viewport.cameraControls.maxPolarAngle = Math.PI - Math.PI / 3;
        // this.viewport.cameraControls.minAzimuthAngle = - Math.PI / 4;
        // this.viewport.cameraControls.maxAzimuthAngle = Math.PI + Math.PI / 4;
        this.viewport.interactiveControls = new SelectionControls(this, this.viewport.camera, this.viewport);
        this.bokehPass = new BokehPass(this.viewport.scene, this.viewport.camera, {
            focus: 500.0,
            aperture: 3 * 0.00001,
            maxblur: 0.15,
            width: window.innerWidth,
            height: window.innerHeight // ?
        });
        this.viewport.composer.addPass(this.bokehPass);
        this.viewport.addEventListener('before-render', this.onBeforeRender);
    }
    selectedPrintAreaChanged(change) {
        for (let i = 0; i < this.garmentMeshes.length; i++) {
            const mat = this.garmentMeshes[i].material;
            mat.selectedPrintAreaIndex = -1;
            const index = mat.printAreas.findIndex((printArea) => { return printArea === this.selectedPrintArea; });
            mat.selectedPrintAreaIndex = index;
        }
        if (change.oldValue) {
            change.oldValue.selection.length = 0;
            change.oldValue.render();
        }
        this.viewport.render();
    }
    selectedGraphicChanged() {
        if (this.selectedPrintArea) {
            this.selectedPrintArea.selection.length = 0;
            if (this.selectedGraphic) {
                this.selectedPrintArea.selection.push(this.selectedGraphic);
            }
            this.selectedPrintArea.render();
        }
    }
    setGarmentColor(r, g, b) {
        for (let i = 0; i < this.garmentMeshes.length; i++) {
            this.garmentMeshes[i].material.color.setRGB(r, g, b);
        }
        this.viewport.render();
    }
    onBeforeRender() {
        this.bokehPass.uniforms.focus.value = this.viewport.camera.position.distanceTo(this.viewport.cameraControls.position);
        this.bokehPass.uniforms.maxblur.value = 1000 / this.viewport.camera.position.distanceTo(this.viewport.cameraControls.position);
        this.bokehPass.uniforms.aperture.value = 0.0035 / this.viewport.camera.position.distanceTo(this.viewport.cameraControls.position);
    }
    loadScene(url) {
        fetch(url).then(response => response.json())
            .then((sceneSpec) => {
            if (sceneSpec) {
                this.sceneSpec = sceneSpec;
                // Load environment IBL
                const environment = this.sceneSpec.environment;
                if (environment.ibl) {
                    this.viewport.loadIbl(this.sceneSpec.environment.ibl.url);
                }
                // Load environment model
                if (environment.model) {
                    this.viewport.loadModel(environment.model.url, (gltfGroup) => {
                        gltfGroup.traverse((obj) => {
                            obj.layers.set(1);
                        });
                        const m = environment.model;
                        if (m) {
                            if (m.position)
                                gltfGroup.position.set(m.position.x, m.position.y, m.position.z);
                            if (m.rotation)
                                gltfGroup.rotation.set(m.rotation.x, m.rotation.y, m.rotation.z);
                            if (m.scale)
                                gltfGroup.scale.set(m.scale.x, m.scale.y, m.scale.z);
                        }
                    });
                }
                const garment = this.sceneSpec.garment;
                // Load garment model
                this.viewport.loadModel(garment.model.url, (gltfGroup) => {
                    this.garmentMeshes.length = 0;
                    // this.viewport.cameraControls.envelope = gltfGroup;
                    gltfGroup.traverse((obj) => {
                        obj.layers.set(1);
                        if (obj instanceof Mesh) {
                            this.garmentMeshes.push(obj);
                            obj.geometry.computeTangents();
                            const material = new GarmentMaterial();
                            material.copy(obj.material);
                            obj.material = material;
                        }
                    });
                    const m = garment.model;
                    if (m.position)
                        gltfGroup.position.set(m.position.x, m.position.y, m.position.z);
                    if (m.rotation)
                        gltfGroup.rotation.set(m.rotation.x, m.rotation.y, m.rotation.z);
                    if (m.scale)
                        gltfGroup.scale.set(m.scale.x, m.scale.y, m.scale.z);
                    if (garment.printAreas) {
                        for (let i = 0; i < garment.printAreas.length; i++) {
                            // Load printAreas
                            const printArea = new PrintArea(garment.printAreas[i], this.viewport.renderer);
                            const targetMesh = this.garmentMeshes.find((mesh) => mesh.name === printArea.targetMeshName);
                            if (targetMesh && targetMesh.material instanceof GarmentMaterial) {
                                targetMesh.material.printAreas.push(printArea);
                                printArea.addEventListener('rendered', this.viewport.render);
                            }
                        }
                    }
                    if (garment.textures) {
                        for (let i = 0; i < garment.textures.length; i++) {
                            const textureSpec = garment.textures[i];
                            const texture = textureLoader.load(textureSpec.url, this.viewport.render);
                            texture.wrapS = RepeatWrapping;
                            texture.wrapT = RepeatWrapping;
                            texture.anisotropy = 4;
                            const targets = textureSpec.targets;
                            if (textureSpec.repeat)
                                texture.repeat.set(textureSpec.repeat.x, textureSpec.repeat.y);
                            if (targets && textureSpec.channel) {
                                for (let j = 0; j < targets.length; j++) {
                                    const mesh = this.garmentMeshes.find(mesh => { return mesh.name === targets[j]; });
                                    const material = mesh?.material;
                                    // TODO: temp fix for tshirt v07
                                    material.map = null;
                                    material.metalnessMap = null;
                                    material.roughnessMap = null;
                                    material[textureSpec.channel] = texture;
                                }
                            }
                        }
                    }
                });
                // Load envelope model
                const e = garment.envelope;
                if (e) {
                    this.viewport.loadModel(e.url, (gltfGroup) => {
                        this.viewport.cameraControls.envelope = gltfGroup;
                        gltfGroup.traverse((obj) => {
                            obj.layers.set(1);
                            if (obj.material) {
                                obj.material.transparent = true;
                                obj.material.opacity = 0;
                            }
                        });
                        if (e.position)
                            gltfGroup.position.set(e.position.x, e.position.y, e.position.z);
                        if (e.rotation)
                            gltfGroup.rotation.set(e.rotation.x, e.rotation.y, e.rotation.z);
                        if (e.scale)
                            gltfGroup.scale.set(e.scale.x, e.scale.y, e.scale.z);
                    });
                }
            }
        });
    }
    loadPrintLayer(file, printAreaSpec, uv) {
        const reader = new FileReader();
        reader.addEventListener('load', event => {
            if (event.target) {
                const url = event.target.result;
                const pos = new Vector2((uv.x - 0.5) * 2, (uv.y - 0.5) * 2);
                const newPrintLayer = {
                    url: url,
                    position: { x: pos.x, y: pos.y, z: 0 }
                };
                printAreaSpec.layers.push(newPrintLayer);
                const mesh = this.garmentMeshes.find(mesh => { return mesh.name === printAreaSpec.targetMeshName; });
                const material = mesh?.material;
                const printArea = material.printAreas.find(printArea => { return printArea.name === printAreaSpec.name; });
                if (printArea) {
                    printArea.loadLayer(newPrintLayer);
                }
            }
        });
        reader.readAsDataURL(file);
    }
}
RegisterIoElement(StagedEditor);
//# sourceMappingURL=staged-editor.js.map