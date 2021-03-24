const pinFieldJumbotron = document.getElementById("pin-field-jumbotron");

pinFieldJumbotron.addEventListener("complete", () => {
  pinFieldJumbotron.inputs.forEach(input => (input.disabled = true));
});

pinFieldJumbotron.format = key => key.toUpperCase();
pinFieldJumbotron.onComplete = function () {
  this.inputs.forEach(input => (input.disabled = true));
};

const pinFieldWithEvts = document.getElementById("pin-field-with-evts");
pinFieldWithEvts.addEventListener("change", evt => alert(`PIN Field changed: ${evt.detail.value}`));
pinFieldWithEvts.addEventListener("complete", evt => alert(`PIN Field completed: ${evt.detail.value}`));
pinFieldWithEvts.addEventListener("resolve", evt => alert(`PIN Field key resolved: ${evt.detail.key}`));
pinFieldWithEvts.addEventListener("reject", evt => alert(`PIN Field key resolved: ${evt.detail.key}`));
