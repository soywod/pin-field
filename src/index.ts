const IGNORED_META_KEYS = ["Alt", "Control", "Enter", "Meta", "Shift", "Tab"];

function range(start: number, length: number) {
  return Array.from({length}, (_, i) => i + start);
}

function getPrevInputIdx(cursor: number) {
  return Math.max(0, cursor - 1);
}

function getNextInputIdx(cursor: number, max: number) {
  if (max === 0) return 0;
  return Math.min(cursor + 1, max - 1);
}

type Fallback = {
  idx: number;
  val: string;
};

type Effect =
  | {type: "handle-code-change"}
  | {type: "focus-input"; idx: number}
  | {type: "set-input-val"; idx: number; val: string}
  | {type: "resolve-key"; idx: number; key: string}
  | {type: "reject-key"; idx: number; key: string}
  | {type: "handle-delete"; idx: number};

type Action =
  | {type: "handle-key-down"; idx: number; key: string; val: string}
  | {type: "handle-key-up"; idx: number; val: string}
  | {type: "handle-paste"; idx: number; val: string};

export type PinFieldValidator = string | string[] | RegExp | ((key: string) => boolean);
export type PinFieldFormatter = (key: string) => string;

export class PinField extends HTMLElement {
  /**
   * Current input focus cursor.
   */
  private cursor: number = 0;

  /**
   * Actions stack.
   */
  private actions: Action[] = [];

  /**
   * Effects stack.
   */
  private effects: Effect[] = [];

  /**
   * State-holder fallback for old browsers and mobile support.
   */
  private fallback: Fallback | null = null;

  /**
   * Wrapper around the validator (for internal use).
   */
  private isKeyAllowed(key?: string) {
    if (!key) return false;
    if (key.length > 1) return false;
    if (typeof this.validate === "string") return this.validate.split("").includes(key);
    if (this.validate instanceof Array) return this.validate.includes(key);
    if (this.validate instanceof RegExp) return this.validate.test(key);
    return this.validate(key);
  }

  /**
   * Logger.
   */
  private log(scope: string, fn: string, msg?: string) {
    if (this.debug) {
      console.debug(`[PIN Field] (${scope}) ${fn}${msg ? `: ${msg}` : ""}`);
    }
  }

  /**
   * List of HTMLInputElement the PIN Field is composed of.
   */
  inputs: HTMLInputElement[] = [];

  /**
   * Length of the field.
   */
  length: number = 5;

  /**
   * Validator.
   */
  validate: PinFieldValidator = /^[a-zA-Z0-9]$/;

  /**
   * Formatter.
   */
  format: PinFieldFormatter = (key: string) => {
    return key;
  };

  /**
   * Debug getter.
   */
  get debug() {
    return this.hasAttribute("debug");
  }

  /**
   * Debug setter.
   */
  set debug(val: boolean) {
    if (val) {
      this.setAttribute("debug", "");
    } else {
      this.removeAttribute("debug");
    }
  }

  /**
   * Disabled getter.
   */
  get disabled() {
    return this.hasAttribute("disabled");
  }

  /**
   * Disabled setter.
   */
  set disabled(val: boolean) {
    if (val) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
  }

  /**
   * List of observed attributes.
   */
  static get observedAttributes() {
    return ["debug", "disabled"];
  }

  /**
   * Attribute changed callback.
   */
  protected attributeChangedCallback(name: string, prevVal: string | null, nextVal: string | null) {
    if (prevVal !== nextVal) {
      switch (name) {
        case "debug": {
          this.debug = nextVal !== null;
          break;
        }
        case "disabled": {
          this.inputs.forEach(i => (i.disabled = this.disabled));
          break;
        }
      }
    }
  }

  /**
   * Connected callback.
   */
  connectedCallback() {
    if (this.hasAttribute("length")) {
      this.length = Number(this.getAttribute("length")) || 5;
      if (this.length < 1) {
        throw new RangeError(`The PIN Field length should be greater than 0 (got ${this.length})`);
      }
    }

    const validate = this.getAttribute("validate");
    if (typeof validate === "string") {
      this.validate = validate;
    }

    const input = document.createElement("input");
    input.autocapitalize = "off";
    input.autocomplete = "off";
    input.inputMode = "text";

    const clearAttrs = [];
    for (let i = 0; i < this.attributes.length; i++) {
      const attr = this.attributes[i];
      if (!["id", "autofocus", "debug"].includes(attr.name)) {
        input.setAttribute(attr.name, attr.value);
        clearAttrs.push(() => attr && this.removeAttribute(attr.name));
      }
    }

    this.append(
      ...range(0, this.length).map(idx => {
        const inputClone = input.cloneNode(true) as HTMLInputElement;

        if (idx === 0 && this.hasAttribute("autofocus")) {
          inputClone.setAttribute("autofocus", "");
          this.removeAttribute("autofocus");
        }

        this.inputs.push(inputClone);
        return inputClone;
      }),
    );

    const tpl = document.createElement("slot");
    const css = document.createElement("style");
    css.innerText = ":host{display:flex;}";
    this.attachShadow({mode: "open"}).append(css, tpl);

    clearAttrs.forEach(clear => clear());
    this.inputs.forEach((input, idx) => {
      input.addEventListener("keydown", this.handleKeyDown(idx));
      input.addEventListener("keyup", this.handleKeyUp(idx));
      input.addEventListener("paste", this.handlePaste(idx));
    });
  }

  /**
   * Disconnected callback.
   */
  disconnectedCallback() {
    this.inputs.forEach((input, idx) => {
      input.removeEventListener("keydown", this.handleKeyDown(idx));
      input.removeEventListener("keyup", this.handleKeyUp(idx));
      input.removeEventListener("paste", this.handlePaste(idx));
    });
  }

  /**
   * Set a value starting from a specific index using the effects stack.
   */
  private applySetValAt(idx: number, val: string) {
    if (val.split("").slice(0, this.length).every(this.isKeyAllowed.bind(this))) {
      const pasteLen = Math.min(val.length, this.length - idx);
      const nextCursor = getNextInputIdx(pasteLen + idx - 1, this.length);

      this.effects.push(
        {type: "handle-code-change"},
        {type: "focus-input", idx: nextCursor},
        ...range(0, pasteLen).flatMap<Effect>(i => [
          {
            type: "set-input-val",
            idx: idx + i,
            val: val[i],
          },
          {
            type: "resolve-key",
            idx: idx + i,
            key: val[i],
          },
        ]),
      );
    } else {
      this.effects.push(
        {type: "handle-code-change"},
        {type: "reject-key", idx, key: val},
        {type: "set-input-val", idx, val: ""},
      );
    }
  }

  /**
   * Execute all actions present in the stack.
   * An action should mutate internal state and generate effects.
   */
  private executeAll() {
    while (this.actions.length > 0) {
      const action = this.actions.pop() as Action;

      switch (action.type) {
        case "handle-key-down": {
          this.log("action", "handle-key-down", `key=${action.key}`);

          switch (action.key) {
            case "Unidentified": {
              this.fallback = {idx: action.idx, val: action.val};
              break;
            }

            case "Dead": {
              this.effects = [
                {type: "handle-code-change"},
                {type: "reject-key", idx: action.idx, key: action.key},
                {type: "set-input-val", idx: action.idx, val: ""},
              ];
              break;
            }

            case "ArrowLeft": {
              this.cursor = getPrevInputIdx(action.idx);
              this.effects = [{type: "focus-input", idx: this.cursor}];
              break;
            }

            case "ArrowRight": {
              this.cursor = getNextInputIdx(action.idx, this.length);
              this.effects = [{type: "focus-input", idx: this.cursor}];
              break;
            }

            case "Delete":
            case "Backspace": {
              this.effects = [{type: "handle-code-change"}, {type: "handle-delete", idx: action.idx}];
              break;
            }

            default: {
              if (this.isKeyAllowed(action.key)) {
                this.cursor = getNextInputIdx(action.idx, this.length);
                this.effects = [
                  {type: "handle-code-change"},
                  {type: "focus-input", idx: this.cursor},
                  {type: "resolve-key", idx: action.idx, key: action.key},
                  {type: "set-input-val", idx: action.idx, val: action.key},
                ];
              } else {
                this.effects = [{type: "reject-key", idx: action.idx, key: action.key}];
              }
            }
          }

          break;
        }

        case "handle-key-up": {
          if (!this.fallback) {
            this.log("action", "handle-key-up", "ignored");
            break;
          }

          this.log("action", "handle-key-up");
          const {idx, val: prevVal} = this.fallback;
          let val = action.val;

          if (prevVal === "" && val === "") {
            this.effects.push({type: "handle-delete", idx}, {type: "handle-code-change"});
          } else if (prevVal !== "" && val !== "") {
            val = prevVal === val[0] ? val.substring(1) : val.substring(0, val.length - 1);
            this.applySetValAt(idx, val);
          } else if (val !== "") {
            this.applySetValAt(idx, val);
          }

          this.fallback = null;
          break;
        }

        case "handle-paste": {
          this.applySetValAt(action.idx, action.val);
          break;
        }
      }
    }
  }

  /**
   * Apply all effects present in the stack.
   * An effect is an action with side-effects.
   */
  private applyAll() {
    while (this.effects.length > 0) {
      const eff = this.effects.pop() as Effect;

      switch (eff.type) {
        case "focus-input": {
          this.log("effect", "focus-input", `idx=${eff.idx}`);
          this.inputs[eff.idx].focus();
          break;
        }

        case "set-input-val": {
          this.log("effect", "set-input-val", `idx=${eff.idx},val=${eff.val}`);
          const val = this.format(eff.val);
          this.inputs[eff.idx].value = val;
          break;
        }

        case "resolve-key": {
          this.log("effect", "resolve-key", `idx=${eff.idx},key=${eff.key}`);
          this.inputs[eff.idx].setCustomValidity("");
          this.dispatchEvent(new CustomEvent("resolve", {detail: {key: eff.key}}));
          break;
        }

        case "reject-key": {
          this.log("effect", "reject-key", `idx=${eff.idx},key=${eff.key}`);
          this.inputs[eff.idx].setCustomValidity("Invalid key");
          this.dispatchEvent(new CustomEvent("reject", {detail: {key: eff.key}}));
          break;
        }

        // TODO: split into existing effects
        case "handle-delete": {
          this.log("effect", "handle-delete", `idx=${eff.idx}`);
          const prevVal = this.inputs[eff.idx].value;
          this.inputs[eff.idx].setCustomValidity("");
          this.inputs[eff.idx].value = "";

          if (!prevVal) {
            const prevIdx = getPrevInputIdx(eff.idx);
            this.inputs[prevIdx].focus();
            this.inputs[prevIdx].setCustomValidity("");
            this.inputs[prevIdx].value = "";
          }

          break;
        }

        case "handle-code-change": {
          const dir = (document.documentElement.getAttribute("dir") || "ltr").toLowerCase();
          const codeArr = this.inputs.map(r => r.value.trim());
          const value = (dir === "rtl" ? codeArr.reverse() : codeArr).join("");
          this.log("effect", "handle-code-change", `val={${value}}`);
          this.dispatchEvent(new CustomEvent("change", {detail: {value}}));

          if (value.length === this.length) {
            this.setAttribute("completed", "");
            this.dispatchEvent(new CustomEvent("complete", {detail: {value}}));
          } else {
            this.removeAttribute("completed");
          }

          break;
        }
      }
    }
  }

  /**
   * Execute all actions, then apply all effects.
   */
  private render() {
    this.executeAll();
    this.applyAll();
  }

  /**
   * Wrapper around key down event handler.
   */
  private handleKeyDown(idx: number) {
    return (evt: KeyboardEvent) => {
      if (IGNORED_META_KEYS.includes(evt.key) || evt.ctrlKey || evt.altKey || evt.metaKey) {
        this.log("handleKeyDown", "ignored", `idx=${idx},key=${evt.key}`);
        return;
      }

      if (evt.target instanceof HTMLInputElement) {
        evt.preventDefault();
        const val = evt.target.value;
        this.log("handleKeyDown", "triggered", `idx=${idx},key=${evt.key},val=${val}`);
        this.actions.push({type: "handle-key-down", idx, key: evt.key, val});
        this.render();
      }
    };
  }

  /**
   * Wrapper around key up event handler.
   */
  private handleKeyUp(idx: number) {
    return (evt: KeyboardEvent) => {
      if (evt.target instanceof HTMLInputElement) {
        const val = evt.target.value;
        this.log("handleKeyUp", "triggered", `idx=${idx},val=${val}`);
        this.actions.push({type: "handle-key-up", idx, val});
        this.render();
      }
    };
  }

  /**
   * Wrapper around paste event handler.
   */
  private handlePaste(idx: number) {
    return (evt: ClipboardEvent) => {
      evt.preventDefault();
      const val = evt.clipboardData ? evt.clipboardData.getData("Text") : "";
      this.log("handlePaste", "triggered", `idx=${idx},val=${val}`);
      this.actions.push({type: "handle-paste", idx, val});
      this.render();
    };
  }
}

customElements.define("swd-pin-field", PinField);

export default PinField;
