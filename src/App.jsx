
import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const WIDTH = 900;
const HEIGHT = 560;

export default function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  const [screen, setScreen] = useState("menu");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(
    Number(localStorage.getItem("spaceBest") || 0)
  );
  const [muted, setMuted] = useState(false);
  const [bossHealth, setBossHealth] = useState(100);

  const startGame = () => {
    gameRef.current = {
      player: { x: 450, y: 480 },
      bullets: [],
      enemies: [],
      enemyBullets: [],
      particles: [],
      stars: Array.from({ length: 100 }, () => ({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        speed: Math.random() * 2 + 0.5,
        size: Math.random() * 2 + 1
      })),
      keys: {},
      score: 0,
      lives: 3,
      level: 1,
      frame: 0,
      lastShot: 0,
      lastEnemy: 0,
      boss: null,
      bossShot: 0,
      bossDamage: 0,
      invulnerable: 0
    };

    setScore(0);
    setLives(3);
    setLevel(1);
    setBossHealth(100);
    setScreen("playing");
  };

  useEffect(() => {
    if (screen !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const game = gameRef.current;
    let animationId;
    let running = true;

    const keyDown = (e) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      ) e.preventDefault();

      game.keys[e.key.toLowerCase()] = true;

      if (e.key === "Escape") setScreen("paused");
    };

    const keyUp = (e) => {
      game.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    const explode = (x, y, color = "#00d9ff") => {
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;

        game.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 35,
          color
        });
      }
    };

    const drawShip = (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = "#00d9ff";
      ctx.shadowBlur = 25;

      ctx.fillStyle = "#00d9ff";
      ctx.beginPath();
      ctx.moveTo(0, -27);
      ctx.lineTo(22, 22);
      ctx.lineTo(0, 13);
      ctx.lineTo(-22, 22);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(6, 4);
      ctx.lineTo(-6, 4);
      ctx.fill();

      ctx.fillStyle = "#ff8c42";
      ctx.beginPath();
      ctx.moveTo(-8, 20);
      ctx.lineTo(0, 36 + Math.random() * 8);
      ctx.lineTo(8, 20);
      ctx.fill();

      ctx.restore();
    };

    const drawBoss = (boss) => {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.shadowColor = "#ff286e";
      ctx.shadowBlur = 25;
      ctx.fillStyle = "#7c235e";

      ctx.beginPath();
      ctx.moveTo(0, 45);
      ctx.lineTo(-75, 10);
      ctx.lineTo(-110, -15);
      ctx.lineTo(-60, -10);
      ctx.lineTo(-35, -48);
      ctx.lineTo(0, -35);
      ctx.lineTo(35, -48);
      ctx.lineTo(60, -10);
      ctx.lineTo(110, -15);
      ctx.lineTo(75, 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff286e";
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const draw = () => {
      if (!running) return;

      const p = game.player;
      game.frame++;

      ctx.fillStyle = "#050816";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Звёзды
      game.stars.forEach((s) => {
        s.y += s.speed;
        if (s.y > HEIGHT) {
          s.y = 0;
          s.x = Math.random() * WIDTH;
        }

        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.4 + s.size / 4;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      });
      ctx.globalAlpha = 1;

      // Движение игрока
      if (game.keys.arrowleft || game.keys.a) p.x -= 6;
      if (game.keys.arrowright || game.keys.d) p.x += 6;
      if (game.keys.arrowup || game.keys.w) p.y -= 6;
      if (game.keys.arrowdown || game.keys.s) p.y += 6;

      p.x = Math.max(25, Math.min(WIDTH - 25, p.x));
      p.y = Math.max(40, Math.min(HEIGHT - 35, p.y));

      drawShip(p.x, p.y);

      // Стрельба
      if (
        (game.keys[" "] || game.keys.enter) &&
        game.frame - game.lastShot > 12
      ) {
        game.bullets.push({ x: p.x, y: p.y - 25 });
        game.lastShot = game.frame;
      }

      game.bullets.forEach((b) => {
        b.y -= 10;
        ctx.fillStyle = "#ffe66d";
        ctx.shadowColor = "#ffe66d";
        ctx.shadowBlur = 15;
        ctx.fillRect(b.x - 3, b.y, 6, 18);
      });
      ctx.shadowBlur = 0;

      game.bullets = game.bullets.filter((b) => b.y > 0);

      // Босс появляется после 100 очков
      if (game.score >= 100 && !game.boss) {
        game.boss = {
          x: WIDTH / 2,
          y: 90,
          hp: 100,
          direction: 1
        };
        game.bossDamage = 0;
      }

      // Создание врагов
      if (!game.boss && game.frame - game.lastEnemy > Math.max(18, 55 - game.level * 5)) {
        game.enemies.push({
          x: Math.random() * (WIDTH - 60) + 30,
          y: -30,
          speed: Math.random() * 2 + 2 + game.level * 0.3,
          hp: 1,
          size: 17
        });
        game.lastEnemy = game.frame;
      }

      // Враги
      game.enemies.forEach((e) => {
        e.y += e.speed;

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = "#ff3864";
        ctx.shadowColor = "#ff3864";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.lineTo(-20, -12);
        ctx.lineTo(0, -5);
        ctx.lineTo(20, -12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Попадание пуль во врагов
      game.enemies = game.enemies.filter((e) => {
        const hit = game.bullets.findIndex(
          (b) => Math.hypot(b.x - e.x, b.y - e.y) < 25
        );

        if (hit !== -1) {
          game.bullets.splice(hit, 1);
          game.score += 10;
          explode(e.x, e.y, "#ff3864");
          return false;
        }
        return e.y < HEIGHT + 30;
      });

      // Босс
      if (game.boss) {
        const boss = game.boss;
        boss.x += boss.direction * 2.5;

        if (boss.x > WIDTH - 130 || boss.x < 130) {
          boss.direction *= -1;
        }

        drawBoss(boss);

        game.bullets = game.bullets.filter((b) => {
          if (
            Math.abs(b.x - boss.x) < 100 &&
            Math.abs(b.y - boss.y) < 65
          ) {
            boss.hp -= 2;
            game.bossDamage++;
            return false;
          }
          return true;
        });

        if (game.frame - game.bossShot > 80) {
          game.enemyBullets.push({
            x: boss.x,
            y: boss.y + 45,
            speed: 5
          });
          game.bossShot = game.frame;
        }

        if (boss.hp <= 0) {
          explode(boss.x, boss.y, "#ff286e");
          game.score += 200;
          game.boss = null;
          game.level++;
          setLevel(game.level);
          setBossHealth(100);
        } else {
          setBossHealth(boss.hp);
        }
      }

      // Снаряды босса
      game.enemyBullets.forEach((b) => {
        b.y += b.speed;
        ctx.fillStyle = "#ff286e";
        ctx.shadowColor = "#ff286e";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      game.enemyBullets = game.enemyBullets.filter((b) => {
        if (Math.hypot(b.x - p.x, b.y - p.y) < 25) {
          if (game.invulnerable <= 0) {
            game.lives--;
            game.invulnerable = 60;
            explode(p.x, p.y, "#ff286e");
          }
          return false;
        }
        return b.y < HEIGHT + 20;
      });

      // Столкновения с врагами
      game.enemies = game.enemies.filter((e) => {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 30) {
          if (game.invulnerable <= 0) {
            game.lives--;
            game.invulnerable = 60;
            explode(p.x, p.y, "#ff286e");
          }
          return false;
        }
        return true;
      });

      if (game.invulnerable > 0) game.invulnerable--;

      // Частицы и взрывы
      game.particles = game.particles.filter((part) => {
        part.x += part.vx;
        part.y += part.vy;
        part.life--;

        ctx.globalAlpha = part.life / 35;
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, 4, 4);
        ctx.globalAlpha = 1;

        return part.life > 0;
      });

      if (game.frame % 5 === 0) {
        setScore(game.score);
        if (game.score > Number(localStorage.getItem("spaceBest") || 0)) {
          localStorage.setItem("spaceBest", game.score);
          setBest(game.score);
        }
        setLives(game.lives);
      }

      if (game.lives <= 0) {
        setScore(game.score);
        setScreen("over");
        return;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [screen]);

  const move = (key, active) => {
    if (gameRef.current) {
      gameRef.current.keys[key] = active;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">🚀 SPACE GAME <span>PRO</span></div>
        <button className="sound" onClick={() => setMuted(!muted)}>
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      <main className="container">
        <div className="stats">
          <div>⭐ SCORE <b>{score}</b></div>
          <div>❤️ LIVES <b>{lives}</b></div>
          <div>👑 RATING <b>{best}</b></div>
          <div>🌌 LEVEL <b>{level}</b></div>
        </div>

        {gameRef.current?.boss && screen === "playing" && (
          <div className="boss-bar">
            <span>BOSS HEALTH</span>
            <div>
              <div style={{ width: `${bossHealth}%` }} />
            </div>
          </div>
        )}

        <div className="game-screen">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />

          {screen !== "playing" && (
            <div className="overlay">
              {screen === "menu" && (
                <>
                  <h1>SPACE ADVENTURE</h1>
                  <p>YOUR GALAXY. YOUR MISSION.</p>
                  <button onClick={startGame}>🚀 START GAME</button>
                  <small>DESTROY ENEMIES • DEFEAT THE BOSS</small>
                </>
              )}

              {screen === "paused" && (
                <>
                  <h1>PAUSED</h1>
                  <button onClick={() => setScreen("playing")}>▶ CONTINUE</button>
                  <button className="secondary" onClick={() => setScreen("menu")}>
                    MENU
                  </button>
                </>
              )}

              {screen === "over" && (
                <>
                  <h1>GAME OVER</h1>
                  <p>YOUR SCORE: {score}</p>
                  <p>BEST SCORE: {best}</p>
                  <button onClick={startGame}>🔄 PLAY AGAIN</button>
                  <button className="secondary" onClick={() => setScreen("menu")}>
                    MENU
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="instructions">
          <span>⬅️ ➡️ ⬆️ ⬇️ MOVE</span>
          <span>SPACE SHOOT</span>
          <span>ESC PAUSE</span>
        </div>

        <div className="mobile-controls">
          <div className="move-controls">
            <button onPointerDown={() => move("arrowleft", true)} onPointerUp={() => move("arrowleft", false)} onPointerLeave={() => move("arrowleft", false)}>⬅️</button>
            <button onPointerDown={() => move("arrowup", true)} onPointerUp={() => move("arrowup", false)} onPointerLeave={() => move("arrowup", false)}>⬆️</button>
            <button onPointerDown={() => move("arrowdown", true)} onPointerUp={() => move("arrowdown", false)} onPointerLeave={() => move("arrowdown", false)}>⬇️</button>
            <button onPointerDown={() => move("arrowright", true)} onPointerUp={() => move("arrowright", false)} onPointerLeave={() => move("arrowright", false)}>➡️</button>
          </div>
          <button
            className="fire"
            onPointerDown={() => move(" ", true)}
            onPointerUp={() => move(" ", false)}
            onPointerLeave={() => move(" ", false)}
          >
            🔫 FIRE
          </button>
        </div>

        <footer>SPACE GAME PRO © 2026 — GALAXY WARRIOR</footer>
      </main>
    </div>
  );
}
