⚠️ *Project archived due to multiple issues related to Web
Components. See its [React
implementation](https://github.com/soywod/react-pin-field).*

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
<script type="module" src="https://cdn.jsdelivr.net/npm/@soywod/pin-field/dist/pin-field.esm.js"></script>
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

## Sponsoring

[![github](https://img.shields.io/badge/-GitHub%20Sponsors-fafbfc?logo=GitHub%20Sponsors)](https://github.com/sponsors/soywod)
[![paypal](https://img.shields.io/badge/-PayPal-0079c1?logo=PayPal&logoColor=ffffff)](https://www.paypal.com/paypalme/soywod)
[![ko-fi](https://img.shields.io/badge/-Ko--fi-ff5e5a?logo=Ko-fi&logoColor=ffffff)](https://ko-fi.com/soywod)
[![buy-me-a-coffee](https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?logo=Buy%20Me%20A%20Coffee&logoColor=000000)](https://www.buymeacoffee.com/soywod)
[![liberapay](https://img.shields.io/badge/-Liberapay-f6c915?logo=Liberapay&logoColor=222222)](https://liberapay.com/soywod)
