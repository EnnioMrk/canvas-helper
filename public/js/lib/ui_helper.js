/* exported uih_manager */
/* global uih_scripts_init, log */

class uih_template {
  constructor(type, content) {
    this.type = type;
    this.content = content;
  }
}

// eslint-disable-next-line no-unused-vars
class uih_manager {
  constructor(game, wrapper) {
    this.game = game;
    this.wrapper = wrapper;
    this.onloads = new Map();
    this.offloads = new Map();
    this.vars = new Array();
    this.var_watchers = new Map();
    this.pages = new Array();
  }
  get_all_templates() {
    return new Promise((resolve, reject) => {
      fetch("/ui/templates.html")
        .then((response) => response.text())
        .then((text) => new DOMParser().parseFromString(text, "text/html"))
        .then((doc) => {
          let templates = Array.from(doc.querySelectorAll("template"));
          //id is the id of the template
          this.templates = templates.map((t) => {
            return new uih_template(t.id, t.content.cloneNode(true));
          });
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
  register_page(config) {
    config.wrapper.dataset.page_id = config.id;
    if (config.onload) this.onloads.set(config.id, config.onload);
    if (config.offload) this.offloads.set(config.id, config.offload);
    this.pages.push(config);
  }
  change_page(id) {
    let page = this.wrapper.querySelector(`[data-page_id="${id}"]`);
    if (!page) {
      log.error("Page not found", { id });
      return;
    }
    this.wrapper.querySelectorAll("[data-page_id]").forEach((p) => {
      if (!p.classList.contains("hidden")) {
        p.classList.add("hidden");
        if (this.offloads.has(p.dataset.page_id)) {
          this.offloads.get(p.dataset.page_id)();
        }
      }
    });

    let page_config = this.pages.find((p) => p.id == id);
    if (page_config?.heading) {
      this.heading.textContent = page_config.heading;
    } else {
      this.heading.textContent = this.default_heading;
    }

    page.classList.remove("hidden");
    if (this.onloads.has(id)) {
      this.onloads.get(id)();
    }
  }
  load_ui(config) {
    this.pages = config;
    config.forEach((page_config) => {
      if (page_config.id === -1) {
        //config
        if (page_config.heading) {
          this.heading = document.getElementById(page_config.heading);
          if (!this.heading) {
            log.error("Heading not found", {
              id: page_config.heading,
            });
            return;
          }
          this.default_heading = this.heading.textContent;
        }
        return;
      }
      let page_element = document.createElement("div");
      //page classes: "absolute w-full h-full flex justify-center items-center"
      page_element.classList.add(
        "hidden",
        "absolute",
        "w-full",
        "h-full",
        "flex",
        "justify-center",
        "items-center"
      );
      page_element.dataset.page_id = page_config.id;
      let page_content_element = document.createElement("div");
      page_content_element.classList.add(
        "bg-zinc-800",
        "p-8",
        "rounded-lg",
        "flex",
        "flex-col",
        "[&_*]:m-2"
      );

      page_config.elements.forEach((element) => {
        //load template
        let template = this.templates?.find((t) => t.type === element.type);
        if (!template) {
          log.error("Template not found");
          return;
        }
        const serializer = new XMLSerializer();
        let document_fragment_string = serializer.serializeToString(
          template.content
        );
        document_fragment_string = document_fragment_string.replaceAll(
          /\{\{(\w+)\}\}/g,
          (match, p1) => element[p1] || element.data[p1]
        );
        let element_element = new DOMParser().parseFromString(
          document_fragment_string,
          "text/html"
        ).firstChild.lastChild.firstChild;

        if (element.onclick !== undefined) {
          switch (element.onclick.action) {
            case "changePage":
              element_element.addEventListener("click", () => {
                this.change_page(element.onclick.page);
                if (element.onclick.command) {
                  eval(element.onclick.command);
                }
              });
              break;
            default:
              break;
          }
        }

        //add event listener for change for var-somename
        const var_elements = element_element.querySelectorAll("[var]");
        var_elements.forEach((var_element) => {
          let listen_method = var_element.getAttribute("var").split("-")[0];
          let var_name = var_element.getAttribute("var").split("-")[1];

          log.debug(`Listening for ${listen_method} on ${var_name}`);
          //add event listener for change
          this.vars.push({
            element_name: element.name,
            element: var_element,
            var: var_name,
            value: var_element.value,
          });
          var_element.addEventListener(listen_method, () => {
            //call watcher
            if (this.var_watchers.has(element.name)) {
              this.var_watchers.get(element.name)(var_name, var_element.value);
            }
          });
        });

        //append element to page
        page_content_element.appendChild(element_element);
      });
      page_element.appendChild(page_content_element);

      this.wrapper.appendChild(page_element);
    });
    //show first page
    uih_scripts_init();
    let first_page = this.wrapper.querySelector('[data-page_id="1"]');
    first_page.classList.remove("hidden");
  }
  register_var_watcher(name, callback) {
    this.var_watchers.set(name, callback);
  }
  set_var(name, v, value) {
    let var_element;
    if (!value) {
      var_element = this.vars.find((v) => v.element_name == name);
      value = v;
    } else {
      var_element = this.vars.find(
        (v2) => v2.element_name == name && v2.var == v
      );
    }
    if (!var_element) {
      log.error("Var not found");
      return;
    }
    var_element.element.value = value;
    var_element.element.dispatchEvent(new Event("change"));
    var_element.element.dispatchEvent(new Event("input"));
  }
}
