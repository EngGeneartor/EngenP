"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useTheme } from "next-themes"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
}

interface Orb {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color1: string
  color2: string
  phase: number
  speed: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLORS_DARK = ["#8B5CF6", "#7C3AED", "#6366F1", "#A78BFA"]
const COLORS_LIGHT = ["#8B5CF6", "#7C3AED", "#6366F1", "#A78BFA"]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const particlesRef = useRef<Particle[]>([])
  const orbsRef = useRef<Orb[]>([])
  const animFrameRef = useRef<number>(0)
  const dimensionsRef = useRef({ w: 0, h: 0 })
  const timeRef = useRef(0)

  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === "dark" : true

  // -----------------------------------------------------------------------
  // Initialise particles
  // -----------------------------------------------------------------------
  const initParticles = useCallback((w: number, h: number, dark: boolean) => {
    const count = dark ? 80 : 55
    const particles: Particle[] = []
    const colors = dark ? COLORS_DARK : COLORS_LIGHT

    for (let i = 0; i < count; i++) {
      particles.push({
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-0.3, 0.3),
        vy: rand(-0.3, 0.3),
        size: dark ? rand(1.2, 2.8) : rand(1.6, 3.2),
        opacity: dark ? rand(0.25, 0.6) : rand(0.15, 0.35),
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    return particles
  }, [])

  // -----------------------------------------------------------------------
  // Initialise orbs (gradient blobs behind particle layer)
  // -----------------------------------------------------------------------
  const initOrbs = useCallback((w: number, h: number, dark: boolean) => {
    const orbs: Orb[] = [
      {
        x: w * 0.2,
        y: h * 0.15,
        vx: 0.15,
        vy: 0.1,
        radius: Math.min(w, h) * 0.35,
        color1: dark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.06)",
        color2: "transparent",
        phase: 0,
        speed: 0.0004,
      },
      {
        x: w * 0.8,
        y: h * 0.75,
        vx: -0.12,
        vy: -0.08,
        radius: Math.min(w, h) * 0.28,
        color1: dark ? "rgba(124,58,237,0.10)" : "rgba(124,58,237,0.05)",
        color2: "transparent",
        phase: Math.PI * 0.7,
        speed: 0.0003,
      },
      {
        x: w * 0.5,
        y: h * 0.5,
        vx: 0.08,
        vy: -0.12,
        radius: Math.min(w, h) * 0.22,
        color1: dark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)",
        color2: "transparent",
        phase: Math.PI * 1.3,
        speed: 0.0005,
      },
      {
        x: w * 0.7,
        y: h * 0.2,
        vx: -0.1,
        vy: 0.14,
        radius: Math.min(w, h) * 0.18,
        color1: dark ? "rgba(167,139,250,0.07)" : "rgba(167,139,250,0.035)",
        color2: "transparent",
        phase: Math.PI * 0.3,
        speed: 0.00035,
      },
    ]
    return orbs
  }, [])

  // -----------------------------------------------------------------------
  // Main effect
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    // --- Resize handler ---------------------------------------------------
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dimensionsRef.current = { w, h }

      // Re-init if first time or significant size change
      if (
        particlesRef.current.length === 0 ||
        Math.abs(w - dimensionsRef.current.w) > 200
      ) {
        particlesRef.current = initParticles(w, h, isDark)
        orbsRef.current = initOrbs(w, h, isDark)
      }
    }

    resize()
    // Force re-init on theme change
    particlesRef.current = initParticles(
      dimensionsRef.current.w,
      dimensionsRef.current.h,
      isDark
    )
    orbsRef.current = initOrbs(
      dimensionsRef.current.w,
      dimensionsRef.current.h,
      isDark
    )

    window.addEventListener("resize", resize)

    // --- Mouse handler ----------------------------------------------------
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 }
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseleave", onMouseLeave)

    // --- Connection distance & config -------------------------------------
    const CONNECTION_DIST = 150
    const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST
    const MOUSE_RADIUS = 180
    const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS
    const lineOpacityMax = isDark ? 0.14 : 0.07

    // --- Draw functions ---------------------------------------------------

    const drawOrbs = (t: number) => {
      const { w, h } = dimensionsRef.current
      for (const orb of orbsRef.current) {
        const ox = orb.x + Math.sin(t * orb.speed + orb.phase) * (w * 0.08)
        const oy = orb.y + Math.cos(t * orb.speed * 0.7 + orb.phase) * (h * 0.06)
        const pulseFactor = 1 + Math.sin(t * orb.speed * 1.5 + orb.phase) * 0.08

        const grad = ctx.createRadialGradient(
          ox, oy, 0,
          ox, oy, orb.radius * pulseFactor
        )
        grad.addColorStop(0, orb.color1)
        grad.addColorStop(0.5, orb.color1.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.4})`))
        grad.addColorStop(1, orb.color2)

        ctx.beginPath()
        ctx.arc(ox, oy, orb.radius * pulseFactor, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    }

    const drawGrid = (t: number) => {
      const { w, h } = dimensionsRef.current
      const gridSpacing = 80
      const gridOpacity = isDark ? 0.035 : 0.02
      const drift = (t * 0.008) % gridSpacing

      ctx.strokeStyle = isDark
        ? `rgba(139,92,246,${gridOpacity})`
        : `rgba(99,102,241,${gridOpacity})`
      ctx.lineWidth = 0.5

      // Horizontal lines
      for (let y = -gridSpacing + drift; y < h + gridSpacing; y += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Vertical lines
      for (let x = -gridSpacing + drift; x < w + gridSpacing; x += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
    }

    const drawWireframeSphere = (t: number) => {
      const { w, h } = dimensionsRef.current
      const cx = w * 0.78
      const cy = h * 0.35
      const radius = Math.min(w, h) * 0.14
      const rings = 10
      const segments = 16
      const rotSpeed = t * 0.0002
      const sphereOpacity = isDark ? 0.06 : 0.03

      ctx.strokeStyle = isDark
        ? `rgba(139,92,246,${sphereOpacity})`
        : `rgba(99,102,241,${sphereOpacity})`
      ctx.lineWidth = 0.6

      // Latitude rings
      for (let i = 0; i <= rings; i++) {
        const phi = (Math.PI * i) / rings
        const ringRadius = radius * Math.sin(phi)
        const ringY = cy + radius * Math.cos(phi)

        ctx.beginPath()
        for (let j = 0; j <= segments; j++) {
          const theta = (2 * Math.PI * j) / segments + rotSpeed
          const px = cx + ringRadius * Math.cos(theta)
          const py = ringY + ringRadius * Math.sin(theta) * 0.3 // flatten for 3D look
          if (j === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // Longitude lines
      for (let j = 0; j < segments; j++) {
        const theta = (2 * Math.PI * j) / segments + rotSpeed
        ctx.beginPath()
        for (let i = 0; i <= rings; i++) {
          const phi = (Math.PI * i) / rings
          const ringRadius = radius * Math.sin(phi)
          const ringY = cy + radius * Math.cos(phi)
          const px = cx + ringRadius * Math.cos(theta)
          const py = ringY + ringRadius * Math.sin(theta) * 0.3
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
    }

    const drawParticlesAndConnections = () => {
      const { w, h } = dimensionsRef.current
      const particles = particlesRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Update positions
      for (const p of particles) {
        // Mouse interaction — gentle repel
        const dmx = p.x - mx
        const dmy = p.y - my
        const distMouseSq = dmx * dmx + dmy * dmy
        if (distMouseSq < MOUSE_RADIUS_SQ && distMouseSq > 0) {
          const distMouse = Math.sqrt(distMouseSq)
          const force = (MOUSE_RADIUS - distMouse) / MOUSE_RADIUS * 0.008
          p.vx += (dmx / distMouse) * force
          p.vy += (dmy / distMouse) * force
        }

        // Damping
        p.vx *= 0.999
        p.vy *= 0.999

        // Clamp velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed > 0.5) {
          p.vx = (p.vx / speed) * 0.5
          p.vy = (p.vy / speed) * 0.5
        }

        p.x += p.vx
        p.y += p.vy

        // Bounce off edges with padding
        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        if (p.x > w) { p.x = w; p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }
        if (p.y > h) { p.y = h; p.vy *= -1 }
      }

      // Draw connections (with spatial culling — skip pairs far apart)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const distSq = dx * dx + dy * dy

          if (distSq < CONNECTION_DIST_SQ) {
            const dist = Math.sqrt(distSq)
            const opacity = (1 - dist / CONNECTION_DIST) * lineOpacityMax
            const { r, g, b: bl } = hexToRgb(a.color)
            ctx.strokeStyle = `rgba(${r},${g},${bl},${opacity})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const { r, g, b } = hexToRgb(p.color)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`
        ctx.fill()
      }
    }

    // --- Animation loop ---------------------------------------------------
    let lastTime = performance.now()

    const animate = (now: number) => {
      const dt = now - lastTime
      lastTime = now
      timeRef.current += dt
      const t = timeRef.current

      const { w, h } = dimensionsRef.current
      ctx.clearRect(0, 0, w, h)

      // Layer 1: Subtle grid
      drawGrid(t)

      // Layer 2: Floating orbs (behind particles)
      drawOrbs(t)

      // Layer 3: Wireframe sphere
      drawWireframeSphere(t)

      // Layer 4: Particles + mesh connections
      drawParticlesAndConnections()

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    // --- Cleanup ----------------------------------------------------------
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseleave", onMouseLeave)
    }
  }, [isDark, initParticles, initOrbs])

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: isDark ? 0.7 : 0.4 }}
      />
      {/* Noise texture overlay — preserved from original for texture */}
      <div
        className="absolute inset-0"
        style={{
          opacity: isDark ? 0.03 : 0.015,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 55%, rgba(15,10,30,0.35) 100%)"
            : "radial-gradient(ellipse at center, transparent 55%, rgba(240,235,255,0.2) 100%)",
        }}
      />
    </div>
  )
}
