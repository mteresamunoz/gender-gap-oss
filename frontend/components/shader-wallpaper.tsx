"use client"

import { useEffect, useRef, useCallback } from "react"

interface Ripple {
  x: number
  y: number
  time: number
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
}

export function ShaderWallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const animationRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 })
  const ripplesRef = useRef<Ripple[]>([])
  const startTimeRef = useRef(Date.now())
  const isMobileDevice = useRef(isMobile())

  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  const fragmentShaderSource = `
    precision highp float;
    
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform vec4 u_ripples[5];
    uniform int u_rippleCount;
    
    // --- Optimized simplex noise ---
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                              dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    
    // --- Optimized FBM: 3 octaves (was 5) ---
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 3; i++) {
        v += a * snoise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }
    
    vec3 coral = vec3(0.941, 0.6, 0.482);
    vec3 teal  = vec3(0.365, 0.792, 0.647);
    vec3 darkBg = vec3(0.051, 0.059, 0.078);
    vec3 cyan  = vec3(0.2, 0.8, 0.9);
    
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 centeredUv = uv - 0.5;
      float aspect = u_resolution.x / u_resolution.y;
      centeredUv.x *= aspect;
      
      // Mouse influence
      vec2 mouseInfluence = u_mouse - 0.5;
      mouseInfluence.x *= aspect;
      float mouseDist = length(centeredUv - mouseInfluence);
      float mouseGlow = smoothstep(0.8, 0.0, mouseDist) * 0.3;
      
      float t = u_time * 0.15;
      
      // --- Reduced noise layers ---
      vec2 noiseCoord = centeredUv * 2.0;
      float n1 = fbm(noiseCoord + vec2(t * 0.3, t * 0.2));
      float n2 = fbm(noiseCoord * 1.5 - vec2(t * 0.2, t * 0.4) + n1 * 0.3);
      float n3 = fbm(noiseCoord * 0.5 + vec2(sin(t * 0.5), cos(t * 0.3)));
      
      // Warped UV
      vec2 warpedUv = centeredUv + vec2(n1 * 0.15, n2 * 0.15);
      
      // Bands
      float bands = sin(warpedUv.x * 3.0 + warpedUv.y * 2.0 + t * 2.0 + n1 * 2.0) * 0.5 + 0.5;
      bands = smoothstep(0.3, 0.7, bands);
      
      // Radial pulse
      float radialDist = length(centeredUv);
      float pulse = sin(radialDist * 8.0 - t * 3.0 + n2 * 2.0) * 0.5 + 0.5;
      pulse *= smoothstep(1.2, 0.0, radialDist);
      
      // Grid (simplified)
      vec2 gridUv = warpedUv * 20.0;
      float gridX = smoothstep(0.9, 1.0, abs(sin(gridUv.x * 3.14159)));
      float gridY = smoothstep(0.9, 1.0, abs(sin(gridUv.y * 3.14159)));
      float grid = max(gridX, gridY) * 0.15 * smoothstep(0.8, 0.2, radialDist);
      
      // Ripples
      float rippleEffect = 0.0;
      for (int i = 0; i < 5; i++) {
        if (i >= u_rippleCount) break;
        vec2 ripplePos = u_ripples[i].xy - 0.5;
        ripplePos.x *= aspect;
        float rippleTime = u_ripples[i].z;
        float rippleAge = u_time - rippleTime;
        if (rippleAge < 3.0 && rippleAge > 0.0) {
          float rippleDist = length(centeredUv - ripplePos);
          float rippleRadius = rippleAge * 0.5;
          float ripple = smoothstep(rippleRadius - 0.1, rippleRadius, rippleDist) *
                        smoothstep(rippleRadius + 0.1, rippleRadius, rippleDist);
          ripple *= (1.0 - rippleAge / 3.0);
          rippleEffect += ripple * 0.5;
        }
      }
      
      // --- Color mixing (merged layers) ---
      vec3 color = darkBg;
      
      // Background gradient + bands (merged)
      float bgGrad = radialDist * 0.5;
      vec3 bandColor = mix(coral * 0.4, teal * 0.4, bands);
      color = mix(color, darkBg * 1.5, bgGrad);
      color = mix(color, bandColor, n3 * 0.3 + 0.1);
      
      // Pulse glow
      color += mix(teal, coral, pulse) * pulse * 0.15;
      
      // Mouse glow
      color += mix(coral, teal, sin(t * 0.5) * 0.5 + 0.5) * mouseGlow;
      
      // Grid
      color += vec3(grid) * teal * 0.5;
      
      // Ripples
      color += mix(coral, cyan, 0.5) * rippleEffect;
      
      // Vignette + grain (merged)
      float vignette = 1.0 - smoothstep(0.3, 1.0, radialDist);
      color *= vignette * 0.4 + 0.6;
      color += snoise(gl_FragCoord.xy * 0.5 + u_time * 10.0) * 0.02;
      
      color = pow(color, vec3(0.95));
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `

  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("[v0] Shader compile error:", gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    return shader
  }, [])

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", { 
      antialias: true, 
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    })
    if (!gl) {
      console.error("[v0] WebGL not supported")
      return
    }
    glRef.current = gl

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[v0] Program link error:", gl.getProgramInfoLog(program))
      return
    }

    programRef.current = program
    gl.useProgram(program)

    // Set up vertex buffer for full-screen quad
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  }, [createShader, vertexShaderSource, fragmentShaderSource])

  const render = useCallback(() => {
    const gl = glRef.current
    const program = programRef.current
    const canvas = canvasRef.current
    if (!gl || !program || !canvas) return

    // Smooth mouse interpolation
    mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05
    mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05

    // Update uniforms
    const time = (Date.now() - startTimeRef.current) / 1000
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), canvas.width, canvas.height)
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), time)
    gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), mouseRef.current.x, mouseRef.current.y)

    // Update ripples
    const activeRipples = ripplesRef.current.filter(r => time - r.time < 3.0).slice(0, 5)
    ripplesRef.current = activeRipples
    
    const rippleData = new Float32Array(20)
    activeRipples.forEach((ripple, i) => {
      rippleData[i * 4] = ripple.x
      rippleData[i * 4 + 1] = ripple.y
      rippleData[i * 4 + 2] = ripple.time
      rippleData[i * 4 + 3] = 0
    })
    
    const ripplesLocation = gl.getUniformLocation(program, "u_ripples")
    gl.uniform4fv(ripplesLocation, rippleData)
    gl.uniform1i(gl.getUniformLocation(program, "u_rippleCount"), activeRipples.length)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    animationRef.current = requestAnimationFrame(render)
  }, [])

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Mobile: DPR = 1 to save GPU; Desktop: cap at 2
    const dpr = isMobileDevice.current ? 1 : Math.min(window.devicePixelRatio, 2)
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.targetX = e.clientX / window.innerWidth
    mouseRef.current.targetY = 1.0 - e.clientY / window.innerHeight
  }, [])

  const handleClick = useCallback((e: MouseEvent) => {
    const time = (Date.now() - startTimeRef.current) / 1000
    ripplesRef.current.push({
      x: e.clientX / window.innerWidth,
      y: 1.0 - e.clientY / window.innerHeight,
      time
    })
  }, [])

  useEffect(() => {
    handleResize()
    initWebGL()
    render()

    window.addEventListener("resize", handleResize, { passive: true })
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("click", handleClick, { passive: true })

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick)
    }
  }, [handleResize, initWebGL, render, handleMouseMove, handleClick])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{
        touchAction: 'none',
        maxWidth: '100vw',
        maxHeight: '100vh',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  )
}
