/* global cvh_game, cvh_object_manager, log */

const canvas = document.getElementById('mainCanvas');
const game = new cvh_game(
    canvas,
    [() => window.innerWidth, () => window.innerHeight],
    { backgroundColor: '#000' }
);
const om = new cvh_object_manager(game);

const rect = om.create.rectangle(50, 50, 100, 100, { fill: '#f00' });
rect.angle = 0;
rect.prevMouse = { x: game.mouse.x, y: game.mouse.y };
const movementThreshold = 2;
const speedFactor = 0.1;

const trailColors = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
];
let trailIndex = 0;
let trail = [];

game.tick = () => {
    const dx = game.mouse.x - (rect.x + rect.w / 2);
    const dy = game.mouse.y - (rect.y + rect.h / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > movementThreshold) {
        const angle = Math.atan2(dy, dx);
        const moveX = dx * speedFactor;
        const moveY = dy * speedFactor;

        rect.setX(rect.x + moveX);
        rect.setY(rect.y + moveY);
        rect.angle = angle;

        rect.prevMouse.x = game.mouse.x;
        rect.prevMouse.y = game.mouse.y;

        trail.push({
            x: game.mouse.x,
            y: game.mouse.y,
            color: trailColors[trailIndex],
        });
        trailIndex = (trailIndex + 1) % trailColors.length;
    }
};

rect.draw = (ctx) => {
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.angle);
    ctx.fillStyle = rect.fill;
    ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
};

game.draw_objects = () => {
    const ctx = game.ctx;
    ctx.lineWidth = 5;
    for (let i = 1; i < trail.length; i++) {
        ctx.strokeStyle = trail[i].color;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
    }
    om.draw_objects();
};

game.start = () => {
    game.running = true;
    const drawLoop = () => {
        if (!game.running) return;
        const start = performance.now();
        game.clear_canvas();
        game.tick();
        game.update_objects();
        game.draw_objects();
        const end = performance.now();
        log.info(`Render time: ${(end - start).toFixed(2)} ms`);
        log.info(`Object count: ${om.objects.length}`);
        requestAnimationFrame(drawLoop);
    };
    drawLoop();
};

game.start();
