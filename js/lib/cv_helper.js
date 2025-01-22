/* eslint-disable no-unused-vars */
/*global log*/

class clickListener {
    constructor(om) {
        this.om = om;
        om.game.canvas.addEventListener(
            'click',
            (e) => {
                //loop through all elements and check if they got clicked
                let c_e = [];
                this.om.objects.forEach((o) => {
                    if (o.isInBounds(e.clientX, e.clientY)) {
                        c_e.push(o);
                        o.onClick ? o.onClick(e, false) : '';
                    }
                });
                this.onClick(c_e);
            },
            true
        );
        om.game.canvas.addEventListener(
            'contextmenu',
            (e) => {
                e.preventDefault();
                //loop through all elements and check if they got clicked
                let c_e = [];
                this.om.objects.forEach((o) => {
                    if (o.isInBounds(e.clientX, e.clientY)) {
                        c_e.push(o);
                        o.onRightClick ? o.onRightClick(e, true) : '';
                    }
                });
                this.onClick(c_e, true);
            },
            true
        );
    }
    onClick() {}
}

class assetLoader {
    constructor(blob, w, h) {
        //buffer is an image with multiple or one assets. w and h are the width and height of each asset. Assets in image are ordered from left to right, top to bottom.
        this.blob = blob;
        this.w = w; //width of each asset
        if (w && !h) this.h = w;
        else this.h = h; //height of each asset
        this.assets = new Array();
    }
    load(i) {
        return new Promise((resolve) => {
            //load one asset from the image
            let img = new Image();
            let c = document.createElement('canvas');
            let ctx = c.getContext('2d');
            let url = URL.createObjectURL(this.blob);
            img.src = url;
            img.onload = () => {
                //return array of arrays of arrays. return [[row1 rgba pixels],[row2 rgba pixels],...]
                //i is the index of the asset to load from image. Assets in image are ordered from left to right, top to bottom.
                let row = Math.floor(i / (img.width / this.w));
                let col = i % (img.width / this.w);
                c.width = this.w;
                c.height = this.h;
                ctx.drawImage(
                    img,
                    col * this.w,
                    row * this.h,
                    this.w,
                    this.h,
                    0,
                    0,
                    this.w,
                    this.h
                );
                let data = ctx.getImageData(0, 0, this.w, this.h).data;
                let pixels = new Array();
                for (let i = 0; i < data.length; i += 4) {
                    pixels.push(data.slice(i, i + 4));
                }
                let rows = new Array();
                for (let i = 0; i < pixels.length; i += this.w) {
                    rows.push(pixels.slice(i, i + this.w));
                }
                this.assets.push({
                    pixels: rows,
                    img: c,
                    width: this.w,
                    height: this.h,
                    index: i,
                });
                resolve();
            };
        });
    }
    loadAll() {
        //call load for each asset in image
        return new Promise((resolve) => {
            let img = new Image();
            let url = URL.createObjectURL(this.blob);
            img.src = url;
            img.onload = async () => {
                let rows = img.height / this.h;
                let cols = img.width / this.w;
                for (let i = 0; i < rows * cols; i++) {
                    await this.load(i);
                }
                resolve();
            };
        });
    }
}
class cvh_game {
    constructor(canvas, [w, h], opt) {
        canvas.width = w() || window.innerWidth;
        canvas.height = h() || window.innerHeight;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.running = false;
        this.tick = () => {};
        this.om;
        this.bgColor = opt?.backgroundColor || '#000';
        this.bg = {
            set color(color) {
                this.bgColor = color;
            },
        };
        this.canvasRect = this.canvas.getBoundingClientRect();
        this.mouse = { x: 0, y: 0 };
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        //add resize event listener
        window.addEventListener('resize', () => {
            this.canvas.width = w() || window.innerWidth;
            this.canvas.height = h() || window.innerHeight;
            //console.log(this.canvas.width, this.canvas.height);
            this.canvasRect = this.canvas.getBoundingClientRect();
        });
    }
    clear_canvas() {
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    update_objects() {
        this.om.update_objects();
    }
    draw_objects() {
        this.om.draw_objects();
    }
    draw_loop(s) {
        if (!this.running) return;
        if (s)
            setTimeout(() => requestAnimationFrame(() => this.draw_loop(s)), s);
        else requestAnimationFrame(() => this.draw_loop());
        this.clear_canvas();
        this.tick();
        this.update_objects();
        this.draw_objects();
    }
    //s = speed
    start(s = 1) {
        //starts gameloop
        this.running = true;
        if (s != 1) this.draw_loop(1 / s);
        else this.draw_loop();
    }
    stop() {
        this.running = false;
    }
}

class cvh_object {
    static derived = new Array();
    constructor(om, x, y, opt) {
        if (x == undefined || y == undefined) {
            throw new Error(
                'No X or Y coordinates specified when creating object.'
            );
        }
        if (opt)
            Object.keys(opt).forEach((o_n) => {
                this[o_n] = opt[o_n];
            });
        if (typeof this.normalize == 'function')
            this.normalize_coordinates = this.normalize;
        this.obj;
        this.om = om;
        this._x = x;
        this._y = y;
    }

    get x() {
        return typeof this._x === 'function' ? this._x() : this._x;
    }

    set x(value) {
        this._x = value;
    }

    get y() {
        return typeof this._y === 'function' ? this._y() : this._y;
    }

    set y(value) {
        this._y = value;
    }

    kill() {
        this.om.kill_object(this);
    }

    setX(newX, normalize) {
        if (normalize || this.normalize)
            return (this._x = this.normalize_coordinates([newX, 0])[0]);
        else return (this._x = newX);
    }

    setY(newY, normalize) {
        if (normalize || this.normalize)
            return (this._y = this.normalize_coordinates([0, newY])[1]);
        else return (this._y = newY);
    }

    changeX(newX, normalize) {
        const currentX = this.x;
        if (normalize || this.normalize)
            return (this._x =
                currentX + this.normalize_coordinates([newX, 0])[0]);
        else return (this._x = currentX + newX);
    }

    changeY(newY, normalize) {
        const currentY = this.y;
        if (normalize || this.normalize)
            return (this._y =
                currentY + this.normalize_coordinates([0, newY])[1]);
        else return (this._y = currentY + newY);
    }
}

class cvh_image extends cvh_object {
    static dummy = cvh_object.derived.push(this);
    constructor(om, x, y, asset, opt) {
        super(om, x, y, opt);
        this.asset = asset;
        this._magnify = opt?.magnify ?? 1;
        window.addEventListener('resize', () => {
            this.magnify =
                typeof this._magnify === 'function'
                    ? this._magnify()
                    : this._magnify;
        });
    }

    get magnify() {
        return typeof this._magnify === 'function'
            ? this._magnify()
            : this._magnify;
    }

    set magnify(value) {
        this._magnify = value;
    }

    draw(ctx) {
        ctx.drawImage(
            this.asset.img,
            this.x,
            this.y,
            this.asset.width * this.magnify,
            this.asset.height * this.magnify
        );
    }

    isInBounds(x, y) {
        const canvasRect = this.om.game.canvas.getBoundingClientRect();
        const scaleX = this.om.game.canvas.width / canvasRect.width;
        const scaleY = this.om.game.canvas.height / canvasRect.height;
        const canvasX = (x - canvasRect.left) * scaleX;
        const canvasY = (y - canvasRect.top) * scaleY;
        if (
            canvasX >= this.x &&
            canvasX <= this.x + this.asset.width * this.magnify &&
            canvasY >= this.y &&
            canvasY <= this.y + this.asset.height * this.magnify
        ) {
            return true;
        }
        return false;
    }
}

class cvh_shape extends cvh_object {
    constructor(...args) {
        super(...args);
    }
    begin_draw(ctx) {
        ctx.beginPath();
        ctx.fillStyle = this?.fill ?? '#f00';
        ctx.strokeStyle = this?.border?.color ?? '#f00';
        ctx.lineWidth = this?.border?.width ?? 1;
    }
    end_draw(ctx) {
        ctx.fill();
        if (this?.border && this?.border?.width && this?.border?.width != 0)
            ctx.stroke();
        ctx.closePath();
    }
}

class cvh_polygon extends cvh_shape {
    static dummy = cvh_object.derived.push(this);
    constructor(om, x, y, corners, opt) {
        corners = corners?.flat();
        if (!corners?.length || corners.length % 2) {
            throw new Error(
                'No or invalid corners specified when creating polygon.'
            );
        }
        corners = corners.reduce((acc, c, i) => {
            if (!(i % 2)) {
                return [...acc, [c]];
            }
            acc[Math.floor(i / 2)][1] = c;
            return acc;
        }, []);
        //b_x = biggest x
        //s_x = smallest x
        //b_y = biggest y
        //s_y = smallest y
        let b_x = 0,
            s_x = 0,
            b_y = 0,
            s_y = 0;
        corners.forEach((c) => {
            if (c[0] > b_x) b_x = c[0];
            if (c[0] < s_x) s_x = c[0];
            if (c[1] > b_y) b_y = c[1];
            if (c[1] < s_y) s_y = c[1];
        });
        console.log(b_x, s_x, b_y, s_y);
        //o_w = object width
        let o_w = b_x - s_x;
        let o_h = b_y - s_y;
        if (opt?.normalize) x = x + om.game.canvas.width / 2 - o_w / 2;
        if (opt?.normalize) y = y + om.game.canvas.height / 2 - o_h / 2;
        super(om, x, y, opt);
        this.o_w = o_w;
        this.o_h = o_h;
        this.corners = corners;
    }
    normalize_coordinates(x, y) {
        return [
            x + this.om.game.canvas.width / 2 - this.o_w / 2,
            y + this.om.game.canvas.height / 2 - this.o_h / 2,
        ];
    }
    isInBounds(x, y) {
        const canvasRect = this.om.game.canvas.getBoundingClientRect();
        const scaleX = this.om.game.canvas.width / canvasRect.width;
        const scaleY = this.om.game.canvas.height / canvasRect.height;
        const canvasX = (x - canvasRect.left) * scaleX;
        const canvasY = (y - canvasRect.top) * scaleY;
        //check if point is inside polygon
        let inside = false;
        let x1, y1, x2, y2;
        let xinters;
        let p = this.corners;
        let n = p.length;
        x1 = p[0][0];
        y1 = p[0][1];
        for (let i = 1; i <= n; i++) {
            x2 = p[i % n][0];
            y2 = p[i % n][1];
            if (canvasY > Math.min(y1, y2)) {
                if (canvasY <= Math.max(y1, y2)) {
                    if (canvasX <= Math.max(x1, x2)) {
                        if (y1 != y2) {
                            xinters =
                                ((canvasY - y1) * (x2 - x1)) / (y2 - y1) + x1;
                            if (x1 == x2 || canvasX <= xinters)
                                inside = !inside;
                        }
                    }
                }
            }
            x1 = x2;
            y1 = y2;
        }
        return inside;
    }
    draw(ctx) {
        ctx.moveTo(...this.normalize_coordinates(this.x, this.y));
        super.begin_draw(ctx);
        //make corners array into [[x,y],[x,y]] format
        this.corners.forEach((c) => {
            ctx.lineTo(...this.normalize_coordinates(...c));
        });
        super.end_draw(ctx);
    }
}

class cvh_rectangle extends cvh_shape {
    static dummy = cvh_object.derived.push(this);
    constructor(om, x, y, w, h, opt) {
        if (!w || !h) {
            throw new Error(
                'No width or height specified when creating square.'
            );
        }
        if (opt?.normalize)
            x =
                x +
                om.game.canvas.width / 2 -
                (typeof w === 'function' ? w() : w) / 2;
        if (opt?.normalize)
            y =
                y +
                om.game.canvas.height / 2 -
                (typeof h === 'function' ? h() : h) / 2;
        super(om, x, y, opt);
        this._w = w;
        this._h = h;
    }

    get w() {
        return typeof this._w === 'function' ? this._w() : this._w;
    }

    set w(value) {
        this._w = value;
    }

    get h() {
        return typeof this._h === 'function' ? this._h() : this._h;
    }

    set h(value) {
        this._h = value;
    }

    normalize_coordinates(x, y) {
        return [
            x + this.om.game.canvas.width / 2 - this.w / 2,
            y + this.om.game.canvas.height / 2 - this.h / 2,
        ];
    }

    isInBounds(x, y) {
        const canvasRect = this.om.game.canvas.getBoundingClientRect();
        const scaleX = this.om.game.canvas.width / canvasRect.width;
        const scaleY = this.om.game.canvas.height / canvasRect.height;
        const canvasX = (x - canvasRect.left) * scaleX;
        const canvasY = (y - canvasRect.top) * scaleY;
        if (
            canvasX >= this.x &&
            canvasX <= this.x + this.w &&
            canvasY >= this.y &&
            canvasY <= this.y + this.h
        ) {
            return true;
        }
        return false;
    }

    draw(ctx) {
        super.begin_draw(ctx);
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.closePath();
    }
}

class cvh_circle extends cvh_shape {
    static dummy = cvh_object.derived.push(this);
    constructor(om, x, y, r, opt) {
        if (opt?.normalize) x = x + om.game.canvas.width / 2;
        if (opt?.normalize) y = y + om.game.canvas.height / 2;
        super(om, x, y, opt);
        if (!r) {
            throw new Error('No radius specified when creating circle.');
        }
        this.r = r;
    }
    normalize_coordinates(x, y) {
        return [
            x + this.om.game.canvas.width / 2,
            y + this.om.game.canvas.height / 2,
        ];
    }
    isInBounds(x, y) {
        const canvasRect = this.om.game.canvas.getBoundingClientRect();
        const scaleX = this.om.game.canvas.width / canvasRect.width;
        const scaleY = this.om.game.canvas.height / canvasRect.height;
        const canvasX = (x - canvasRect.left) * scaleX;
        const canvasY = (y - canvasRect.top) * scaleY;
        let dx = canvasX - this.x;
        let dy = canvasY - this.y;
        return dx * dx + dy * dy <= this.r * this.r;
    }
    draw(ctx) {
        super.begin_draw(ctx);
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        super.end_draw(ctx);
    }
}

class cvh_particle extends cvh_shape {
    static dummy = cvh_object.derived.push(this);
    constructor(om, x, y, opt) {
        super(om, x, y, opt);
        this.life = opt?.life || 500; // shorter lifetime
        this.created = Date.now();
        this.velocity = {
            x: (Math.random() - 0.5) * (opt?.speed || 6), // higher speed
            y: (Math.random() - 0.5) * (opt?.speed || 6),
        };
        this.size = opt?.size || 4; // size remains the same
        this.alpha = 1;
        this.color = opt?.color || 'rgba(255, 255, 0, 1)'; // color remains the same
    }

    update() {
        const age = Date.now() - this.created;
        if (age >= this.life) {
            this.kill();
            return;
        }

        this.alpha = 1 - age / this.life;
        this._x += this.velocity.x;
        this._y += this.velocity.y;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.fillStyle = this.color.replace('1)', `${this.alpha})`);
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.closePath();
    }
}

class cvh_object_manager {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        if (!this.ctx) {
            throw new Error(
                'No context specified when creating object_manager.'
            );
        }
        this.objects = new Array();
        this.create = cvh_object.derived.reduce(
            (acc, o) => ({
                ...acc,
                [o.name.slice(4)]: (...args) => {
                    let no = new o(this, ...args);
                    this.objects.push(no);
                    this.sortObjects();
                    return no;
                },
            }),
            {}
        );
        game.om = this;
    }
    kill_object(o) {
        this.objects = this.objects.filter((c_o) => c_o != o);
    }
    clear(type) {
        if (!type || type == 'all') {
            this.objects = new Array();
        } else {
            this.objects = this.objects.filter(
                (o) => !o.constructor.name.endsWith(type)
            );
        }
    }
    update_objects() {
        this.objects.forEach((o) => {
            if (o.update && typeof o.update == 'function') o.update(o);
        });
    }
    draw_objects() {
        this.objects.forEach((o) => o.draw(this.ctx));
    }
    set color(color) {
        this.ctx.fillStyle = color;
    }
    set outline(color) {
        this.ctx.strokeStyle = color;
    }
    createClickListener() {
        return new clickListener(this);
    }
    sortObjects() {
        // Ensure particles are drawn last
        this.objects.sort((a, b) => {
            if (
                a.constructor.name === 'cvh_particle' &&
                b.constructor.name !== 'cvh_particle'
            ) {
                return 1;
            }
            if (
                a.constructor.name !== 'cvh_particle' &&
                b.constructor.name === 'cvh_particle'
            ) {
                return -1;
            }
            return (a.z || 0) - (b.z || 0);
        });
    }
}
