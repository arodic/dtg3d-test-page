import { MeshStandardMaterial, Vector4, DataTexture, RGBAFormat, FloatType, Vector2 } from "three";
const blankDiffuseTexture = new DataTexture(new Float32Array([1, 1, 1, 1]), 1, 1, RGBAFormat, FloatType);
blankDiffuseTexture.needsUpdate = true;
const blankNormalTexture = new DataTexture(new Float32Array([0.5, 0.5, 1, 1]), 1, 1, RGBAFormat, FloatType);
blankNormalTexture.needsUpdate = true;
export class GarmentMaterial extends MeshStandardMaterial {
    shader = null;
    normalMap = blankNormalTexture;
    printAreas = [];
    selectedPrintAreaIndex = -1;
    diffuseDetailTexture = blankDiffuseTexture;
    normalDetailTexture = blankNormalTexture;
    copy(source) {
        super.copy(source);
        this.normalMap = this.normalMap || blankNormalTexture;
        return this;
    }
    onBeforeRender() {
        if (this.shader) {
            this.shader.uniforms.selectedPrintAreaIndex.value = this.selectedPrintAreaIndex;
            this.shader.uniforms.diffuseDetailTextureRepeat.value = this.diffuseDetailTexture.repeat;
            this.shader.uniforms.diffuseDetailTexture.value = this.diffuseDetailTexture;
            this.shader.uniforms.normalDetailTextureRepeat.value = this.normalDetailTexture.repeat;
            this.shader.uniforms.normalDetailTexture.value = this.normalDetailTexture;
            for (let i = 0; i < this.printAreas.length; i++) {
                const a = this.printAreas[i];
                this.shader.uniforms[`printArea${i}Texture`].value = a.renderTarget.texture;
                this.shader.uniforms[`printArea${i}Bounds`].value.set(a.uvBounds[0], a.uvBounds[1], a.uvBounds[2], a.uvBounds[3]);
                this.shader.uniforms[`printArea${i}Size`].value.set(a.renderTarget.width, a.renderTarget.height, a.centimeterWidthHeight[0], a.centimeterWidthHeight[1]);
            }
        }
    }
    onBeforeCompile(shader) {
        this.shader = shader;
        shader.uniforms = Object.assign({
            selectedPrintAreaIndex: { value: this.selectedPrintAreaIndex },
            printArea0Bounds: { value: new Vector4() },
            printArea0Texture: { value: blankDiffuseTexture },
            printArea0Size: { value: new Vector4() },
            printArea1Bounds: { value: new Vector4() },
            printArea1Texture: { value: blankDiffuseTexture },
            printArea1Size: { value: new Vector4() },
            printArea2Bounds: { value: new Vector4() },
            printArea2Texture: { value: blankDiffuseTexture },
            printArea2Size: { value: new Vector4() },
            printArea3Bounds: { value: new Vector4() },
            printArea3Texture: { value: blankDiffuseTexture },
            printArea3Size: { value: new Vector4() },
            diffuseDetailTextureRepeat: { value: new Vector2(100, 100) },
            diffuseDetailTexture: { value: blankDiffuseTexture },
            normalDetailTextureRepeat: { value: new Vector2(100, 100) },
            normalDetailTexture: { value: blankNormalTexture },
        }, shader.uniforms);
        this.shader.uniforms.diffuseDetailTextureRepeat.value = this.diffuseDetailTexture.repeat;
        this.shader.uniforms.diffuseDetailTexture.value = this.diffuseDetailTexture;
        this.shader.uniforms.normalDetailTextureRepeat.value = this.normalDetailTexture.repeat;
        this.shader.uniforms.normalDetailTexture.value = this.normalDetailTexture;
        for (let i = 0; i < this.printAreas.length; i++) {
            const a = this.printAreas[i];
            this.shader.uniforms[`printArea${i}Texture`].value = a.renderTarget.texture;
            this.shader.uniforms[`printArea${i}Bounds`].value.set(a.uvBounds[0], a.uvBounds[1], a.uvBounds[2], a.uvBounds[3]);
            this.shader.uniforms[`printArea${i}Size`].value.set(a.renderTarget.width, a.renderTarget.height, a.centimeterWidthHeight[0], a.centimeterWidthHeight[1]);
        }
        shader.vertexShader = /* glsl */ `
      #define USE_UV
    ` + shader.vertexShader;
        shader.fragmentShader = /* glsl */ `
      uniform float selectedPrintAreaIndex;
      uniform vec4 printArea0Bounds;
      uniform vec4 printArea0Size;
      uniform sampler2D printArea0Texture;
      uniform vec4 printArea1Bounds;
      uniform vec4 printArea1Size;
      uniform sampler2D printArea1Texture;
      uniform vec4 printArea2Bounds;
      uniform vec4 printArea2Size;
      uniform sampler2D printArea2Texture;
      uniform vec4 printArea3Bounds;
      uniform vec4 printArea3Size;
      uniform sampler2D printArea3Texture;
      uniform vec2 diffuseDetailTextureRepeat;
      uniform sampler2D diffuseDetailTexture;
      uniform vec2 normalDetailTextureRepeat;
      uniform sampler2D normalDetailTexture;

      #define USE_UV

      vec4 samplePrintArea(sampler2D areaTexture, vec2 uv, vec4 bounds, vec4 size, bool showDash) {
        vec2 areaUV = vec2((uv.x - bounds.y) / (bounds.w - bounds.y), (uv.y - bounds.x) / (bounds.z - bounds.x));
        vec2 areaUVinv = vec2(1.0 - areaUV.x, 1.0 - areaUV.y);
        vec2 areaUVmax = max(areaUV, areaUVinv);
        vec4 areaCol = texture2D(areaTexture, areaUV);

        if (showDash) {
          float dashX = mod(areaUV.x * size.x / size.z / 2., 2.0) >= 1.0 ? 1.0 : 0.0;
          float dashY = mod(areaUV.y * size.y / size.w / 2., 2.0) >= 1.0 ? 1.0 : 0.0;

          if (areaUVmax.x > (1.0 - 0.25 * size.z / size.x)) areaCol = vec4(0.0, 0.0, 0.0, dashY);
          if (areaUVmax.y > (1.0 - 0.25 * size.w / size.y)) areaCol = vec4(0.0, 0.0, 0.0, dashX);
          if (areaUVmax.x > (1.0 - 0.125 * size.z / size.x)) areaCol = vec4(1.0, 1.0, 1.0, dashY);
          if (areaUVmax.y > (1.0 - 0.125 * size.w / size.y)) areaCol = vec4(1.0, 1.0, 1.0, dashX);
        }

        if (areaUVmax.x > 1.0) areaCol = vec4(1.0, 0.0, 0.0, 0.0);
        if (areaUVmax.y > 1.0) areaCol = vec4(0.0, 1.0, 0.0, 0.0);
        return areaCol;
      }

    ` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>' + /* glsl */ `
        vec4 printArea0 = samplePrintArea(printArea0Texture, vUv, printArea0Bounds, printArea0Size, selectedPrintAreaIndex == 0.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, printArea0.rgb, printArea0.a); 
        vec4 printArea1 = samplePrintArea(printArea1Texture, vUv, printArea1Bounds, printArea1Size, selectedPrintAreaIndex == 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, printArea1.rgb, printArea1.a); 
        vec4 printArea2 = samplePrintArea(printArea2Texture, vUv, printArea2Bounds, printArea2Size, selectedPrintAreaIndex == 2.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, printArea2.rgb, printArea2.a); 
        vec4 printArea3 = samplePrintArea(printArea3Texture, vUv, printArea3Bounds, printArea3Size, selectedPrintAreaIndex == 3.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, printArea3.rgb, printArea3.a);

        diffuseColor *= texture2D(diffuseDetailTexture, vUv * diffuseDetailTextureRepeat, 2.0);
    `);
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + /* glsl */ `
        vec3 normalDetail = texture2D(normalDetailTexture, vUv * normalDetailTextureRepeat, 2.0).xyz * 2.0 - 1.0;
      	normal = normalize( vTBN * normalDetail );
    `);
    }
}
//# sourceMappingURL=GarmentMaterial.js.map