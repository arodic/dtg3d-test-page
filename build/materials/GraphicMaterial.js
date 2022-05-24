import { MeshBasicMaterial, DataTexture, RGBAFormat, FloatType, Color } from "three";
const blankDiffuseTexture = new DataTexture(new Float32Array([1, 1, 1, 1]), 1, 1, RGBAFormat, FloatType);
blankDiffuseTexture.needsUpdate = true;
const blankNormalTexture = new DataTexture(new Float32Array([0.5, 0.5, 1, 1]), 1, 1, RGBAFormat, FloatType);
blankNormalTexture.needsUpdate = true;
export class GraphicMaterial extends MeshBasicMaterial {
    showID = 0;
    objectID = -1;
    shader = null;
    constructor(parameters) {
        const objectID = parameters.objectID;
        delete parameters.objectID;
        super(parameters);
        if (objectID !== undefined)
            this.objectID = objectID;
        this.map = this.map || blankDiffuseTexture;
    }
    onBeforeRender() {
        if (this.shader) {
            this.shader.uniforms.showID.value = this.showID;
            this.shader.uniforms.objectID.value.setHex(this.objectID);
            this.shader.uniforms.materialID.value = this.id;
        }
    }
    onBeforeCompile(shader) {
        this.shader = shader;
        shader.uniforms = Object.assign({
            showID: { value: this.showID },
            objectID: { value: new Color().setHex(this.objectID) },
            materialID: { value: this.id }
        }, shader.uniforms);
        shader.fragmentShader = /* glsl */ `
      uniform float showID;
      uniform vec3 objectID;
      uniform float materialID;
    ` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>' + /* glsl */ `
      if (showID != 0.0) {
        gl_FragColor.rgb = objectID;
        if (gl_FragColor.a < 0.2) discard;
        else gl_FragColor.a = 1.0;
      }
    `);
    }
}
//# sourceMappingURL=GraphicMaterial.js.map