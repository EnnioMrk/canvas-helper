class c_config {
    constructor(args) {
        Object.keys(args).forEach((o) => {
            this[o] = args[o];
        });
    }
}
