const field1 = document.getElementById("pin-field-jumbotron");
field1.format = key => key.toUpperCase();
field1.addEventListener("complete", () => (field1.disabled = true));

const field2 = document.getElementById("pin-field-uppercase");
field2.format = key => key.toUpperCase();

const field3 = document.getElementById("pin-field-with-evts");
field3.addEventListener("change", evt => alert(`PIN Field changed: ${evt.detail.value}`));
field3.addEventListener("complete", evt => alert(`PIN Field completed: ${evt.detail.value}`));
field3.addEventListener("resolve", evt => alert(`PIN Field key resolved: ${evt.detail.key}`));
field3.addEventListener("reject", evt => alert(`PIN Field key rejected: ${evt.detail.key}`));
