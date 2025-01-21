/* global cvh_game, cvh_object_manager, log */

const canvas = document.getElementById('mainCanvas');
const game = new cvh_game(
    canvas,
    [() => window.innerWidth, () => window.innerHeight],
    { backgroundColor: '#000' }
);
const om = new cvh_object_manager(game);

const rect = om.create.rectangle(50, 50, 100, 100, { fill: '#f00' });

game.tick = () => {
    rect.setX(game.mouse.x - rect.w / 2);
    rect.setY(game.mouse.y - rect.h / 2);
};

game.start();
