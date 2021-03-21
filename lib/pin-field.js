import {range, debug} from "./utils.js";
import {getKeyFromKeyboardEvent} from "./keyboard-evt.js";

export const NO_EFFECT = [];
export const PROP_KEYS = ["autoFocus", "length", "validate", "format"];
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

  constructor() {
    super();

    let attrs = document.createElement("input");
    attrs = Array.from(this.children).find(c => c instanceof HTMLInputElement) || attrs;
    attrs = Array.from(attrs);

    this.length = Number(this.getAttribute("length")) || 5;
    this.inputs = range(0, this.length).map(() => {
      const input = document.createElement("input");

      // Customizable properties
      input.setAttribute("part", "input");
      input.type = "text";
      input.autocapitalize = "off";
      input.autocomplete = "off";
      input.autocorrect = "off";
      input.inputMode = "text";

      // Template attributes
      attrs.forEach(attr => {
        input.setAttribute(attr.name, attr.value);
      });

      return input;
    });

    this.attachShadow({mode: "open"}).append(...this.inputs);
  }

  applyActions() {
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
            if (val.split("").slice(0, this.length).every(this.isKeyAllowed.bind(this))) {
              this.pasteVal(idx, val);
            } else {
              this.effects.push(
                {type: "set-input-val", idx, val: ""},
                {type: "reject-key", idx, key: val},
                {type: "handle-code-change"},
              );
            }
          } else if (val !== "") {
            if (val.split("").slice(0, this.length).every(this.isKeyAllowed.bind(this))) {
              this.pasteVal(idx, val);
            } else {
              this.effects.push(
                {type: "set-input-val", idx, val: ""},
                {type: "reject-key", idx, key: val},
                {type: "handle-code-change"},
              );
            }
          }

          this.fallback = null;
          break;
        }

        case "handle-paste": {
          if (!action.val.split("").slice(0, this.length).every(this.isKeyAllowed.bind(this))) {
            debug("reducer", "handle-paste", `rejected,val=${action.val}`);
            this.effects.push({type: "reject-key", idx: action.idx, key: action.val});
            break;
          }

          debug("reducer", "handle-paste", `idx=${action.idx},val=${action.val}`);
          this.pasteVal(action.idx, action.val);
          break;
        }
      }
    });

    this.actions = [];
  }

  applyEffects() {
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
          this.inputs[eff.idx].setAttribute("part", "input valid");
          this.dispatchEvent(new CustomEvent("resolve", {detail: {key: eff.key}}));
          break;
        }

        case "reject-key": {
          debug("effect", "reject-key", `idx=${eff.idx},key=${eff.key}`);
          this.inputs[eff.idx].setCustomValidity("Invalid key");
          this.inputs[eff.idx].setAttribute("part", "input invalid");
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
          const code = (dir === "rtl" ? codeArr.reverse() : codeArr).join("");
          debug("effect", "handle-code-change", `code={${code}}`);
          this.dispatchEvent(new CustomEvent("change", {detail: {code}}));

          if (code.length === this.length) {
            this.setAttribute("complete", "");
            this.dispatchEvent(new CustomEvent("complete", {detail: {code}}));
          } else {
            this.removeAttribute("complete");
          }

          break;
        }
      }
    });

    this.effects = [];
  }

  render() {
    this.applyActions();
    this.applyEffects();
  }

  pasteVal(idx, val) {
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
    );

    if (this.cursor !== nextCursor) {
      this.effects.push({type: "focus-input", idx: nextCursor});
    }

    this.effects.push({type: "handle-code-change"});
  }

  handleFocus(idx) {
    return () => {
      debug("handleFocus", "triggered", `idx=${idx}`);
      this.effects.push({type: "focus-input", idx});
      this.render();
    };
  }

  handleKeyDown(idx) {
    return evt => {
      const key = getKeyFromKeyboardEvent(evt);

      if (IGNORED_META_KEYS.includes(key) || evt.ctrlKey || evt.altKey || evt.metaKey) {
        debug("handleKeyDown", "ignored", `idx=${idx},key=${key}`);
        return;
      }

      evt.preventDefault();
      debug("handleKeyDown", "triggered", `idx=${idx},key=${key}`);
      this.actions.push({type: "handle-key-down", idx, key, val: evt.target.value});
      this.render();
    };
  }

  handleKeyUp(idx) {
    return evt => {
      debug("handleKeyUp", "triggered", `idx=${idx}`);
      this.actions.push({type: "handle-key-up", idx, val: evt.target.value});
      this.render();
    };
  }

  handlePaste(idx) {
    return evt => {
      evt.preventDefault();
      const val = evt.clipboardData.getData("Text");
      debug("handlePaste", "triggered", `idx=${idx},val=${val}`);
      this.actions.push({type: "handle-paste", idx, val});
      this.render();
    };
  }

  connectedCallback() {
    this.inputs.forEach((input, idx) => {
      input.addEventListener("focus", this.handleFocus(idx));
      input.addEventListener("keydown", this.handleKeyDown(idx));
      input.addEventListener("keyup", this.handleKeyUp(idx));
      input.addEventListener("paste", this.handlePaste(idx));
    });
  }

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
