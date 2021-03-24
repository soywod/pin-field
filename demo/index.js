let field = document.getElementById("pin-field-jumbotron");
field.format = key => key.toUpperCase();
field.addEventListener("complete", () => {
  field.inputs.forEach(input => (input.disabled = true));
});

field = document.getElementById("pin-field-uppercase");
field.format = key => key.toUpperCase();

field = document.getElementById("pin-field-with-evts");
field.addEventListener("change", evt => alert(`PIN Field changed: ${evt.detail.value}`));
field.addEventListener("complete", evt => alert(`PIN Field completed: ${evt.detail.value}`));
field.addEventListener("resolve", evt => alert(`PIN Field key resolved: ${evt.detail.key}`));
field.addEventListener("reject", evt => alert(`PIN Field key rejected: ${evt.detail.key}`));
