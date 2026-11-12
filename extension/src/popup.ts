// US-11.1 (#118): popup entry point. For now it only shows the title and the disabled button; #120 adds the states.
const analyzeButton = document.querySelector<HTMLButtonElement>('#analyze-email-button');

if (analyzeButton !== null) {
  analyzeButton.disabled = true;
}
