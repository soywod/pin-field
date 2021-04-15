# 📟 PIN Field [![npm](https://img.shields.io/npm/v/@soywod/pin-field)](https://www.npmjs.com/package/@soywod/pin-field)

Native web component for entering PIN codes.

![gif](https://user-images.githubusercontent.com/10437171/112440937-2e131c00-8d4b-11eb-902c-9aa6b37973be.gif)

*Live demo at https://soywod.github.io/pin-field/demo/.*

## Installation

### From npm

```bash
npm install @soywod/pin-field
# or
yarn add @soywod/pin-field
```

*The package is available in both GitHub Packages and npm registries.*

### From CDN (jsDelivr)

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@soywod/pin-field@0.1.8/lib/pin-field.min.js"></script>
```

## Usage

```html
<swd-pin-field></swd-pin-field>
```

### Attributes

| Name | Description |
| --- | --- |
| `length` | Number of inputs the PIN Field is composed of |
| `validate` | List of allowed chars |

*Additional attributes are transfered to all the inputs (except for `id`).*

### Properties

| Name | Type | Description | Default |
| --- | --- | --- | --- |
| `length` | `number` | Number of inputs the PIN Field is composed of | `5` |
| `validate` | `string\|string[]\|RegExp\|(key: string) => boolean` | Validator | `/^[a-zA-Z0-9]$/` |
| `format` | `(key: string) => string` | Formatter | `key => key` |

### Events

| Name | Description | Data |
| --- | --- | --- |
| `change` | Triggered when the PIN code changes | `{detail: {value: string}}`
| `complete` | Triggered when the PIN code is complete | `{detail: {value: string}}`
| `resolve` | Triggered when a key is resolved | `{detail: {key: string}}`
| `reject` | Triggered when a key is rejected | `{detail: {key: string}}`
