const pinFieldJumbotron = document.getElementById("pin-field-jumbotron");
pinFieldJumbotron.format = key => key.toUpperCase();
pinFieldJumbotron.onComplete = function () {
  this.inputs.forEach(input => (input.disabled = true));
};
