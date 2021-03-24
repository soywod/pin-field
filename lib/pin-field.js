import {range, debug} from "./utils.js";
import {getKeyFromKeyboardEvent} from "./keyboard-evt.js";

export const IGNORED_META_KEYS = ["Alt", "Control", "Enter", "Meta", "Shift", "Tab"];

export function getPrevInputIdx(cursor) {
  return Math.max(0, cursor - 1);
}

export function getNextInputIdx(cursor, max) {
  if (max === 0) return 0;
  return Math.min(cursor + 1, max - 1);
}

export class PinField extends HTMLElement {
  length = 5;
  cursor = 0;
  inputs = [];
  fallback = null;
  validate = /^[a-zA-Z0-9]$/;

  actions = [];
  effects = [];

  isKeyAllowed(key) {
    if (!key) return false;
    if (key.length > 1) return false;
    if (typeof this.validate === "string") return this.validate.split("").includes(key);
    if (this.validate instanceof Array) return this.validate.includes(key);
    if (this.validate instanceof RegExp) return this.validate.test(key);
    return this.validate(key);
  }

  format(key) {
    return key;
  }

  /**
   * @constructor
   */
  constructor() {
    super();

    if (this.hasAttribute("length")) {
      this.length = Number(this.getAttribute("length")) || 5;
      if (this.length < 1) {
        throw new RangeError(`The PIN Field length should be greater than 0 (got ${this.length})`);
      }
    }

    if (this.hasAttribute("validate")) {
      this.validate = this.getAttribute("validate");
    }

    const inputChildren = Array.from(this.children).filter(c => c instanceof HTMLInputElement);
    if (inputChildren.length !== 1) {
      throw new RangeError(`The PIN Field should have one unique input as a child (got ${inputChildren.length})`);
    }

    const inputClones = range(0, this.length - 1).map(() => inputChildren[0].cloneNode(true));
    this.append(...inputClones);
    this.inputs = Array.from(this.children);

    const tpl = document.createElement("slot");
    const css = document.createElement("style");
    css.innerText = ":host{display:flex;}";
    this.attachShadow({mode: "open"}).append(css, tpl);
  }

  /**
   * Set a value starting from a specific index using the effects stack
   *
   * @param {number} idx The starting index
   * @param {number} val The value to paste
   * @returns {void}
   */
  applySetValAt(idx, val) {
    if (val.split("").slice(0, this.length).every(this.isKeyAllowed.bind(this))) {
      const pasteLen = Math.min(val.length, this.length - idx);
      const nextCursor = getNextInputIdx(pasteLen + idx - 1, this.length);

      this.effects.push(
        ...range(0, pasteLen).flatMap(i => [
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
        {type: "focus-input", idx: nextCursor},
        {type: "handle-code-change"},
      );
    } else {
      this.effects.push(
        {type: "set-input-val", idx, val: ""},
        {type: "reject-key", idx, key: val},
        {type: "handle-code-change"},
      );
    }
  }

  /**
   * Execute all actions present in the stack
   *
   * @returns void
   */
  executeAll() {
    this.actions.forEach(action => {
      switch (action.type) {
        case "handle-key-down": {
          debug("action", "handle-key-down", `key=${action.key}`);

          switch (action.key) {
            case "Unidentified": {
              this.fallback = {idx: action.idx, val: action.val};
              break;
            }

            case "Dead": {
              this.effects = [
                {type: "set-input-val", idx: action.idx, val: ""},
                {type: "reject-key", idx: action.idx, key: action.key},
                {type: "handle-code-change"},
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
              this.effects = [{type: "handle-delete", idx: action.idx}, {type: "handle-code-change"}];
              break;
            }

            default: {
              if (this.isKeyAllowed(action.key)) {
                this.cursor = getNextInputIdx(action.idx, this.length);
                this.effects = [
                  {type: "set-input-val", idx: action.idx, val: action.key},
                  {type: "resolve-key", idx: action.idx, key: action.key},
                  {type: "focus-input", idx: this.cursor},
                  {type: "handle-code-change"},
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
            debug("action", "handle-key-up", "ignored");
            break;
          }

          debug("action", "handle-key-up");
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
    });

    this.actions = [];
  }

  /**
   * Apply all effects present in the stack
   *
   * @returns void
   */
  applyAll() {
    this.effects.forEach(eff => {
      switch (eff.type) {
        case "focus-input": {
          debug("effect", "focus-input", `idx=${eff.idx}`);
          this.inputs[eff.idx].focus();
          break;
        }

        case "set-input-val": {
          debug("effect", "set-input-val", `idx=${eff.idx},val=${eff.val}`);
          const val = this.format(eff.val);
          this.inputs[eff.idx].value = val;
          break;
        }

        case "resolve-key": {
          debug("effect", "resolve-key", `idx=${eff.idx},key=${eff.key}`);
          this.inputs[eff.idx].setCustomValidity("");
          this.dispatchEvent(new CustomEvent("resolve", {detail: {key: eff.key}}));
          break;
        }

        case "reject-key": {
          debug("effect", "reject-key", `idx=${eff.idx},key=${eff.key}`);
          this.inputs[eff.idx].setCustomValidity("Invalid key");
          this.dispatchEvent(new CustomEvent("reject", {detail: {key: eff.key}}));
          break;
        }

        case "handle-delete": {
          debug("effect", "handle-delete", `idx=${eff.idx}`);
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
          debug("effect", "handle-code-change", `val={${value}}`);
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
    });

    this.effects = [];
  }

  render() {
    this.executeAll();
    this.applyAll();
  }

  /**
   * Wrapper around focus event handler
   *
   * @param {number} idx The input index
   * @returns {(evt: FocusEvent) => void} The event handler itself
   */
  handleFocus(idx) {
    return () => {
      debug("handleFocus", "triggered", `idx=${idx}`);
      this.effects.push({type: "focus-input", idx});
      this.render();
    };
  }

  /**
   * Wrapper around key down event handler
   *
   * @param {number} idx The input index
   * @returns {(evt: KeyboardEvent) => void} The event handler itself
   */
  handleKeyDown(idx) {
    return evt => {
      if (IGNORED_META_KEYS.includes(evt.key) || evt.ctrlKey || evt.altKey || evt.metaKey) {
        debug("handleKeyDown", "ignored", `idx=${idx},key=${evt.key}`);
        return;
      }

      evt.preventDefault();
      const val = evt.target.value;
      debug("handleKeyDown", "triggered", `idx=${idx},key=${evt.key},val=${val}`);
      this.actions.push({type: "handle-key-down", idx, key: evt.key, val});
      this.render();
    };
  }

  /**
   * Wrapper around key up event handler
   *
   * @param {number} idx The input index
   * @returns {(evt: KeyboardEvent) => void} The event handler itself
   */
  handleKeyUp(idx) {
    return evt => {
      const val = evt.target.value;
      debug("handleKeyUp", "triggered", `idx=${idx},val=${val}`);
      this.actions.push({type: "handle-key-up", idx, val});
      this.render();
    };
  }

  /**
   * Wrapper around paste event handler
   *
   * @param {number} idx The input index
   * @returns {(evt: ClipboardEvent) => void} The event handler itself
   */
  handlePaste(idx) {
    return evt => {
      evt.preventDefault();
      const val = evt.clipboardData.getData("Text");
      debug("handlePaste", "triggered", `idx=${idx},val=${val}`);
      this.actions.push({type: "handle-paste", idx, val});
      this.render();
    };
  }

  /**
   * Connected callback
   *
   * @listens
   * @returns {void}
   */
  connectedCallback() {
    this.inputs.forEach((input, idx) => {
      input.addEventListener("focus", this.handleFocus(idx));
      input.addEventListener("keydown", this.handleKeyDown(idx));
      input.addEventListener("keyup", this.handleKeyUp(idx));
      input.addEventListener("paste", this.handlePaste(idx));
    });
  }

  /**
   * Disconnected callback
   *
   * @returns {void}
   */
  disconnectedCallback() {
    this.inputs.forEach((input, idx) => {
      input.removeEventListener("focus", this.handleFocus(idx));
      input.removeEventListener("keydown", this.handleKeyDown(idx));
      input.removeEventListener("keyup", this.handleKeyUp(idx));
      input.removeEventListener("paste", this.handlePaste(idx));
    });
  }
}

customElements.define("swd-pin-field", PinField);
