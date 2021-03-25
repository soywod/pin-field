# 📟 PIN Field [![npm](https://img.shields.io/github/package-json/v/soywod/pin-field/master?label=version)](https://github.com/soywod?tab=packages&repo_name=pin-field)

Native web component for entering PIN codes.

![gif](https://user-images.githubusercontent.com/10437171/112440937-2e131c00-8d4b-11eb-902c-9aa6b37973be.gif)

*Live demo at https://soywod.github.io/pin-field/demo/.*

## Installation

```bash
yarn add @soywod/pin-field
# or
npm install @soywod/pin-field
# or
<script type="module" src="https://cdn.jsdelivr.net/gh/soywod/pin-field/lib/pin-field.min.js"></script>
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

*All additional attributes are transfered to all the inputs.*

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
