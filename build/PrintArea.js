import { IoNode, RegisterIoNode } from 'io-gui';
import { Group, Box3, Vector3, Matrix4, Color, Vector2, DoubleSide, ShapeGeometry, PlaneGeometry, TextureLoader, LinearFilter, Mesh, WebGLRenderTarget, Scene, OrthographicCamera } from "three";
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { LogLuvLoader } from 'three/examples/jsm/loaders/LogLuvLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from './OutlinePass.js';
import { GraphicMaterial } from './materials/GraphicMaterial.js';
const textureLoader = new TextureLoader();
const tgaLoader = new TGALoader(undefined);
const logLuvLoader = new LogLuvLoader(undefined);
const rgbeLoader = new RGBELoader(undefined);
const exrLoader = new EXRLoader(undefined);
const svgLoader = new SVGLoader(undefined);
export class PrintArea extends IoNode {
    name;
    targetMeshName;
    uvBounds;
    centimeterWidthHeight;
    layers;
    //
    renderer;
    renderTarget;
    pickerRenderTarget;
    scene = new Scene();
    camera;
    composer;
    outlinePass;
    selection = [];
    constructor(spec, renderer) {
        super();
        this.name = spec.name;
        this.targetMeshName = spec.targetMeshName;
        this.uvBounds = spec.uvBounds;
        this.centimeterWidthHeight = spec.centimeterWidthHeight;
        this.layers = spec.layers;
        const w = spec.resolution[0];
        const h = spec.resolution[1];
        this.renderer = renderer;
        this.renderTarget = new WebGLRenderTarget(w, h, { depthBuffer: false, generateMipmaps: true });
        this.pickerRenderTarget = new WebGLRenderTarget(w / 4, h / 4, { depthBuffer: false });
        this.renderTarget.texture.minFilter = LinearFilter;
        this.renderTarget.texture.magFilter = LinearFilter;
        this.camera = new OrthographicCamera(-1, 1, w / h, -w / h, 0, 20);
        this.camera.position.z = 10;
        this.composer = new EffectComposer(this.renderer, this.renderTarget);
        const renderPass = new RenderPass(this.scene, this.camera, undefined, new Color(0xffffff), 0);
        this.composer.addPass(renderPass);
        this.composer.renderToScreen = false;
        this.outlinePass = new OutlinePass(new Vector2(w, h), this.scene, this.camera, this.selection);
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.edgeStrength = 100;
        this.outlinePass.downSampleRatio = 1;
        this.outlinePass.visibleEdgeColor.set('white');
        this.outlinePass.hiddenEdgeColor.set('white');
        this.composer.addPass(this.outlinePass);
        this.composer.setSize(w, h);
        this.render = this.render.bind(this);
        this.loadLayers(spec.layers);
    }
    loadLayers(specs) {
        for (let i = 0; i < specs.length; i++) {
            this.loadLayer(specs[i]);
        }
    }
    loadLayer(spec) {
        let loader = textureLoader;
        const group = new Group();
        if (spec.url.toLowerCase().endsWith('.tga') || spec.url.startsWith('data:image/targa'))
            loader = tgaLoader;
        if (spec.url.toLowerCase().endsWith('.tif') || spec.url.toLowerCase().endsWith('.tiff') || spec.url.startsWith('data:image/tiff'))
            loader = logLuvLoader;
        if (spec.url.toLowerCase().endsWith('.hdr'))
            loader = rgbeLoader;
        if (spec.url.toLowerCase().endsWith('.exr'))
            loader = exrLoader;
        if (spec.url.toLowerCase().endsWith('.svg') || spec.url.startsWith('data:image/svg+xml')) {
            svgLoader.load(spec.url, (data) => {
                const svgGroup = new Group();
                for (let i = 0; i < data.paths.length; i++) {
                    const path = data.paths[i];
                    const fillColor = path.userData.style.fill;
                    if (fillColor !== undefined && fillColor !== 'none') {
                        const material = new GraphicMaterial({
                            color: new Color().setStyle(fillColor).convertSRGBToLinear(),
                            opacity: path.userData.style.fillOpacity,
                            transparent: true,
                            side: DoubleSide,
                            depthWrite: false,
                            wireframe: false,
                            objectID: svgGroup.id
                        });
                        const shapes = SVGLoader.createShapes(path);
                        for (let j = 0; j < shapes.length; j++) {
                            const shape = shapes[j];
                            const geometry = new ShapeGeometry(shape);
                            const mesh = new Mesh(geometry, material);
                            svgGroup.add(mesh);
                        }
                    }
                    const strokeColor = path.userData.style.stroke;
                    if (strokeColor !== undefined && strokeColor !== 'none') {
                        const material = new GraphicMaterial({
                            color: new Color().setStyle(strokeColor).convertSRGBToLinear(),
                            opacity: path.userData.style.strokeOpacity,
                            transparent: true,
                            side: DoubleSide,
                            depthWrite: false,
                            wireframe: false,
                            objectID: svgGroup.id
                        });
                        for (let j = 0, jl = path.subPaths.length; j < jl; j++) {
                            const subPath = path.subPaths[j];
                            const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style, 24, 0.001);
                            if (geometry) {
                                const mesh = new Mesh(geometry, material);
                                svgGroup.add(mesh);
                            }
                        }
                    }
                }
                const bbox = new Box3();
                bbox.setFromObject(svgGroup);
                const offset = new Vector3((bbox.max.x - bbox.min.x) / 2 + bbox.min.x, (bbox.max.y - bbox.min.y) / 2 + bbox.min.y, (bbox.max.z - bbox.min.z) / 2 + bbox.min.z);
                const scaleCorrection = 1 / Math.max(Math.abs(bbox.max.x - bbox.min.x), Math.abs(bbox.max.y - bbox.min.y));
                const offsetMatrix = new Matrix4();
                offsetMatrix.setPosition(offset.multiplyScalar(-1));
                const scaleMatrix = new Matrix4();
                scaleMatrix.scale(new Vector3(scaleCorrection, scaleCorrection, scaleCorrection));
                svgGroup.traverse((obj) => {
                    if (obj instanceof Mesh) {
                        obj.geometry.applyMatrix4(offsetMatrix);
                        obj.geometry.applyMatrix4(scaleMatrix);
                    }
                });
                group.add(svgGroup);
                this.render();
            }, undefined, undefined);
        }
        else {
            const quad = new Mesh(new PlaneGeometry(), new GraphicMaterial({
                map: loader.load(spec.url, () => {
                    this.render();
                }),
                transparent: true
            }));
            quad.material.objectID = quad.id;
            group.add(quad);
        }
        if (spec.position)
            group.position.set(spec.position.x, spec.position.y, spec.position.z);
        if (spec.scale)
            group.scale.set(spec.scale.x, spec.scale.y, spec.scale.z);
        if (spec.rotation)
            group.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
        this.scene.add(group);
        this.scene.children.forEach((child, i) => {
            child.position.z = i / 100;
        });
        this.render();
    }
    render() {
        this.renderer.setRenderTarget(this.pickerRenderTarget);
        this.renderer.setClearColor(0x000000);
        this.renderer.clearColor();
        this.scene.traverse((obj) => { if (obj.material)
            obj.material.showID = 1; });
        this.renderer.render(this.scene, this.camera);
        this.scene.traverse((obj) => { if (obj.material)
            obj.material.showID = 0; });
        this.renderer.setRenderTarget(null);
        this.composer.swapBuffers(); // TODO: why do this?
        this.composer.render(0);
        this.composer.swapBuffers(); // TODO: why do this?
        this.dispatchEvent('rendered');
    }
}
RegisterIoNode(PrintArea);
//# sourceMappingURL=PrintArea.js.map