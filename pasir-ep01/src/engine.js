// Rendering core: scene -> HDR multisampled target (+depth) -> cinematic post shader -> canvas.
import * as THREE from 'three';

export const W = 1280, H = 720; // internal render size (upscaled to 1920x1080 by ffmpeg lanczos)

export class Engine {
  constructor() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(W, H);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NoToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(r.domElement);
    const depth = new THREE.DepthTexture(W, H); depth.type = THREE.UnsignedIntType;
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 2, depthTexture: depth, colorSpace: THREE.LinearSRGBColorSpace });
    this.rt.texture.minFilter = THREE.LinearFilter; this.rt.texture.generateMipmaps = false;

    // overlay canvas (titles / logo bumpers), composited in the post shader
    this.ov = document.createElement('canvas'); this.ov.width = 1920; this.ov.height = 1080;
    this.ovCtx = this.ov.getContext('2d');
    this.ovTex = new THREE.CanvasTexture(this.ov); this.ovTex.colorSpace = THREE.SRGBColorSpace;

    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: depth }, tOv: { value: this.ovTex },
        near: { value: 0.1 }, far: { value: 300 }, focus: { value: 5 }, aperture: { value: 0.0 }, maxBlur: { value: 6.0 },
        res: { value: new THREE.Vector2(W, H) }, time: { value: 0 }, exposure: { value: 1 },
        lift: { value: new THREE.Vector3(0, 0, 0) }, gamma: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) },
        sat: { value: 0.9 }, contrast: { value: 1.08 }, vignette: { value: 0.35 }, grain: { value: 0.045 }, fade: { value: 1 }, letterbox: { value: 0.1 },
        ca: { value: 0.6 }, flash: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) }, ovOn: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tColor, tDepth, tOv; uniform float near, far, focus, aperture, maxBlur, time, exposure, sat, contrast, vignette, grain, fade, letterbox, ca, flash, ovOn;
        uniform vec2 res; uniform vec3 lift, gamma, gain, tint;
        float linDepth(vec2 uv){ float z=texture2D(tDepth,uv).x; float ndc=z*2.-1.; return (2.*near*far)/(far+near-ndc*(far-near)); }
        float coc(float d){ return clamp(abs(d-focus)/max(d,0.001)*aperture*667.0, 0., maxBlur); }
        vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
        float hash(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
        void main(){
          vec2 uv=vUv;
          float d=linDepth(uv); float c=coc(d);
          vec3 col=vec3(0.); float wsum=0.;
          // 16-tap golden-angle disc gather, depth-aware (background doesn't bleed onto sharp foreground)
          if(c < 0.5){ col=texture2D(tColor,uv).rgb; wsum=1.; } else
          for(int i=0;i<12;i++){
            float fi=float(i); float r=sqrt((fi+0.5)/12.); float th=fi*2.39996;
            vec2 o=vec2(cos(th),sin(th))*r*c/res;
            vec2 su=uv+o;
            float sd=linDepth(su); float sc=coc(sd);
            float w = (sd < d-0.05) ? smoothstep(0., 1., sc/(max(c,0.001))) + 0.001 : 1.0;
            col+=texture2D(tColor,su).rgb*w; wsum+=w;
          }
          col/=max(wsum,1e-4);
          // chromatic aberration at edges
          vec2 dc=uv-0.5; float e=dot(dc,dc);
          if(ca>0.){ vec2 off=dc*e*ca*0.012; col.r=mix(col.r, texture2D(tColor,uv+off).r, 0.6); col.b=mix(col.b, texture2D(tColor,uv-off).b, 0.6); }
          col*=exposure*tint;
          col=aces(col);
          // grade (lift/gamma/gain) + contrast + saturation
          col=pow(max(col,0.), 1./gamma); col=col*gain+lift*(1.-col);
          col=(col-0.5)*contrast+0.5;
          float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=mix(vec3(l),col,sat);
          col=clamp(col,0.,1.);
          col=pow(col, vec3(1./2.2)); // to display gamma
          col*=1.-vignette*smoothstep(0.15,0.9,length(dc*vec2(1.25,1.0)));
          float g=hash(uv*res+fract(time*13.7)*vec2(97.,57.))-0.5; col+=g*grain;
          col=mix(col, vec3(1.), flash);
          col*=fade;
          if(ovOn>0.5){ vec4 o=texture2D(tOv,uv); col=mix(col,o.rgb,o.a); }
          if(uv.y<letterbox || uv.y>1.-letterbox) col=vec3(0.);
          gl_FragColor=vec4(col,1.);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.postScene = new THREE.Scene(); this.postScene.add(this.quad); this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setGrade(g = {}) {
    const u = this.post.uniforms;
    u.lift.value.set(...(g.lift || [0, 0, 0])); u.gamma.value.set(...(g.gamma || [1, 1, 1])); u.gain.value.set(...(g.gain || [1, 1, 1]));
    u.sat.value = g.sat ?? 0.88; u.contrast.value = g.contrast ?? 1.08; u.exposure.value = g.exposure ?? 1; u.vignette.value = g.vignette ?? 0.35;
    u.tint.value.set(...(g.tint || [1, 1, 1]));
  }

  render(scene, camera, { focus = 5, aperture = 0, time = 0, fade = 1, flash = 0, overlay = false, letterbox = 0.1 } = {}) {
    const r = this.renderer, u = this.post.uniforms;
    r.setRenderTarget(this.rt); r.clear(); r.render(scene, camera);
    u.near.value = camera.near; u.far.value = camera.far; u.focus.value = focus; u.aperture.value = aperture; u.time.value = time; u.fade.value = fade; u.flash.value = flash; u.letterbox.value = letterbox;
    u.ovOn.value = overlay ? 1 : 0; if (overlay) this.ovTex.needsUpdate = true;
    r.setRenderTarget(null); r.render(this.postScene, this.postCam);
  }

  // render a scene into an offscreen canvas (used for photos inside the story: family photo, basement photo, contact avatar)
  snapshot(scene, camera, w, h, opts = {}) {
    // render through the full pipeline at 16:9 then crop to the requested aspect
    const asp = camera.aspect; camera.aspect = W / H; camera.updateProjectionMatrix();
    this.render(scene, camera, { letterbox: 0, ...opts });
    camera.aspect = asp; camera.updateProjectionMatrix();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const a = w / h; let sw = W, sh = W / a; if (sh > H) { sh = H; sw = H * a; }
    x.drawImage(this.renderer.domElement, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, w, h);
    return c;
  }
}
