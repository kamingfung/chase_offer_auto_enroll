# javascripts to auto-enroll chase offers

1. Add the below to a website bookmark (as URL).
```
javascript:goBack = () => {   window.history.back();   setTimeout(addNextItem, Math.random() * 1000 + 300); };addNextItem = () => {  addButtons = [...document.querySelectorAll('.mds-icon--cpo')].filter(button => button.type === 'ico_add_circle');    buttonToClick = addButtons.pop();  if (!buttonToClick) return alert('Added all!');   buttonToClick.click();   setTimeout(goBack, Math.random() * 1000 + 300);}; addNextItem();
```

2. Login to Chase. Click to the page showing all offers.

3. Click on the bookmark.

4. The script will run check all the offers available. Leave the window untouched and wait until it displays "All added" when it's done.
