// Run via Playwright CLI in a disposable browser session opened on the local app:
// playwright-cli -s=clearplate-fixes run-code --filename scripts/browser-audit-regression.js
// This clears this session's ClearPlate local storage. Never run in a personal-data session.
async (page) => {
  page.setDefaultTimeout(4000);
  const results = [];
  const key = 'clearplate-adpkd-mvp-v3';
  const state = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const reset = async () => {
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.getByRole('button', { name: 'Log outside food', exact: true }).waitFor();
  };
  const check = (value, message) => { if (!value) throw new Error(message); };
  const test = async (name, action) => {
    try { await reset(); await action(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const openFood = async (name, p = page) => {
    await p.getByRole('button', { name: 'Log outside food', exact: true }).click();
    await p.getByRole('textbox', { name: 'Food name' }).fill(name);
  };
  const nutrients = async (sodium = '100', p = page) => {
    await p.getByRole('spinbutton', { name: /Calories/ }).fill('200');
    await p.getByRole('spinbutton', { name: /Protein/ }).fill('10');
    await p.getByRole('spinbutton', { name: /Sodium/ }).fill(sodium);
  };
  const add = async (p = page) => {
    await p.getByRole('button', { name: 'Add to food history' }).click();
    await p.getByRole('dialog').waitFor({ state: 'hidden' });
  };
  await test('name-only food cannot be saved as zero nutrition', async () => {
    await openFood('Missing nutrients');
    await page.getByRole('button', { name: 'Add to food history' }).click();
    check(await page.getByRole('dialog').count() === 1, 'Blank nutrients were saved');
    check(!(await state())?.entries?.length, 'Unexpected food persisted');
  });
  await test('explicit zeros save; optional blanks remain unknown', async () => {
    await openFood('Explicit zeros');
    for (const label of [/Calories/, /Protein/, /Sodium/]) await page.getByRole('spinbutton', { name: label }).fill('0');
    await add();
    const food = (await state()).entries[0].customFood;
    check(food.calories === 0 && food.protein === 0 && food.sodium === 0, 'Explicit zero changed');
    check(food.potassium === null && food.phosphorus === null, 'Optional missing nutrients became zero');
  });
  await test('successful save resets next food portions to one', async () => {
    await openFood('Two servings'); await nutrients();
    await page.getByRole('spinbutton', { name: 'Servings eaten' }).fill('2');
    await add(); await openFood('Next food');
    check(await page.getByRole('spinbutton', { name: 'Servings eaten' }).inputValue() === '1', 'Servings carried over');
  });
  await test('estimated overage retains warning and estimate label', async () => {
    await openFood('Estimated salty dinner'); await nutrients('3200');
    await page.getByRole('button', { name: /Unpackaged food/ }).click();
    await add();
    const band = page.getByRole('region', { name: 'sodium progress', exact: true });
    const text = await band.innerText();
    check(text.includes('Over target') && text.includes('Includes estimates'), 'Overage was hidden by estimate label: ' + text);
    check((await band.getAttribute('class')).includes('danger'), 'Overage lost danger styling');
  });
  await test('G5 disables automatic range and requires manual targets', async () => {
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('combobox', { name: 'Clinician-recorded CKD stage' }).selectOption('G5');
    const auto = page.getByRole('checkbox', { name: /Use ADPKD starting protein range/ });
    check(!await auto.isEnabled() && !await auto.isChecked(), 'G5 still permits automatic G1-G4 range');
    const minimum = page.getByRole('spinbutton', { name: 'Protein minimum (g)', exact: true });
    check(await minimum.isEnabled() && await minimum.inputValue() === '', 'Inherited auto target remains');
    await page.getByRole('button', { name: 'Save plan', exact: true }).click();
    check(await page.getByRole('dialog').count() === 1, 'G5 saved without manual targets');
    await minimum.fill('55');
    await page.getByRole('spinbutton', { name: 'Protein maximum (g)', exact: true }).fill('75');
    await page.getByRole('button', { name: 'Save plan', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    check((await state()).profile.useGuidelineProteinRange === false, 'Auto flag survived save');
  });
  for (const opener of ['Profile', 'Log outside food', 'Add a meal']) {
    await test(opener + ' dialog traps keyboard focus and restores opener', async () => {
      const button = page.getByRole('button', { name: opener, exact: true });
      await button.click();
      const dialog = page.getByRole('dialog');
      check(await dialog.evaluate(e => e.contains(document.activeElement)), 'Initial focus outside dialog');
      await page.getByRole('button', { name: 'Cancel', exact: true }).focus();
      await page.keyboard.press('Tab');
      check(await dialog.evaluate(e => e.contains(document.activeElement)), 'Tab escaped dialog');
      await page.keyboard.press('Shift+Tab');
      check(await dialog.evaluate(e => e.contains(document.activeElement)), 'Shift+Tab escaped dialog');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      check(await button.evaluate(e => e === document.activeElement), 'Focus not restored to opener');
    });
  }
  await test('previously saved G5 auto target requires review on reload', async () => {
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('button', { name: 'Save plan', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.evaluate((k) => {
      const defaultProfile = JSON.parse(localStorage.getItem(k)).profile;
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      localStorage.setItem(k, JSON.stringify({
        profile: { ...defaultProfile, stage: 'G5', useGuidelineProteinRange: true },
        entries: [{ id: 'legacy-meal', date, meal: 'Lunch', source: 'custom', servings: 1,
          customFood: { name: 'Legacy lunch', method: 'packaged', calories: 200, protein: 20, sodium: 100, potassium: null, phosphorus: null } }],
      }));
    }, key);
    await page.reload();
    const protein = page.getByRole('region', { name: 'protein progress', exact: true });
    check((await protein.innerText()).includes('Targets need review'), 'Stored unsupported auto target remains active');
    await page.getByRole('button', { name: 'Add a meal', exact: true }).click();
    check(await page.getByRole('dialog').getByText(/targets need review/i).count() > 0, 'Add meal substitutes a default for missing targets');
    check(!((await page.getByRole('dialog').innerText()).includes('Fits today’s remaining limits')), 'Add meal claims compatibility with missing targets');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'History', exact: true }).click();
    check(await page.locator('main').getByText(/targets need review/i).count() > 0, 'History treats absent protein target as zero');
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    check(await page.getByRole('button', { name: 'Add this idea to Today', exact: true }).count() === 0, 'Plan generated from unsupported auto target');
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    check(await page.getByRole('spinbutton', { name: 'Protein minimum (g)', exact: true }).inputValue() === '', 'Old auto target presented as manual');
  });
  await test('stale profile save preserves meal and draft; explicit retry works', async () => {
    const second = await page.context().newPage();
    second.setDefaultTimeout(4000);
    try {
      await second.goto(page.url());
      await second.getByRole('button', { name: 'Profile', exact: true }).click();
      await second.getByRole('textbox', { name: 'Name', exact: true }).fill('Second tab draft');
      await openFood('Food saved in first tab'); await nutrients(); await add();
      await second.getByRole('button', { name: 'Save plan', exact: true }).click();
      await second.getByRole('alert').filter({ hasText: 'Another tab' }).waitFor();
      check((await state()).entries.length === 1, 'Stale tab erased food');
      check(await second.getByRole('textbox', { name: 'Name', exact: true }).inputValue() === 'Second tab draft', 'Conflict erased draft');
      await second.getByRole('button', { name: 'Save plan', exact: true }).click();
      await second.getByRole('dialog').waitFor({ state: 'hidden' });
      const saved = await state();
      check(saved.entries.length === 1 && saved.profile.name === 'Second tab draft', 'Retry failed to preserve both changes');
      await page.reload();
      check((await state()).entries[0].customFood.name === 'Food saved in first tab', 'Meal lost after reload');
    } finally { await second.close(); }
  });
  await test('failed write preserves custom food draft and portions', async () => {
    await openFood('Unsaved dinner'); await nutrients();
    await page.getByRole('spinbutton', { name: 'Servings eaten' }).fill('2');
    await page.evaluate(() => {
      window.auditOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new DOMException('Quota test', 'QuotaExceededError'); };
    });
    try {
      await page.getByRole('button', { name: 'Add to food history' }).click();
      await page.getByRole('alert').waitFor();
      check(await page.getByRole('textbox', { name: 'Food name' }).inputValue() === 'Unsaved dinner', 'Failed write erased food name');
      check(await page.getByRole('spinbutton', { name: 'Servings eaten' }).inputValue() === '2', 'Failed write reset portions');
      check(!(await state())?.entries?.length, 'Failed write persisted data');
    } finally { await page.evaluate(() => { Storage.prototype.setItem = window.auditOriginalSetItem; delete window.auditOriginalSetItem; }); }
    await add();
    check((await state()).entries.length === 1, 'Retry did not save exactly once');
  });
  await test('simultaneous tabs preserve both foods after explicit retry', async () => {
    const second = await page.context().newPage();
    second.setDefaultTimeout(4000);
    try {
      await second.goto(page.url());
      await openFood('First concurrent meal'); await nutrients();
      await openFood('Second concurrent meal', second); await nutrients('200', second);
      await Promise.all([page, second].map(p => p.getByRole('button', { name: 'Add to food history' }).click()));
      const winner = await Promise.race([page, second].map((p, index) => p.getByRole('dialog').waitFor({ state: 'hidden', timeout: 4000 }).then(() => index)));
      const other = [page, second][1 - winner];
      await other.getByRole('alert').filter({ hasText: 'Another tab' }).waitFor({ timeout: 4000 });
      check((await state()).entries.length === 1, 'Concurrent save overwrote or duplicated records');
      await add(other);
      const names = (await state()).entries.map(e => e.customFood.name).sort();
      check(JSON.stringify(names) === JSON.stringify(['First concurrent meal', 'Second concurrent meal']), 'Explicit retry lost a concurrent meal');
    } finally { await second.close(); }
  });
  await test('pending save cannot be dismissed or submitted twice', async () => {
    await openFood('Delayed save'); await nutrients();
    await page.evaluate(() => {
      window.auditOriginalLock = navigator.locks.request;
      navigator.locks.request = (...args) => new Promise((resolve, reject) => {
        window.auditReleaseSave = () => window.auditOriginalLock.apply(navigator.locks, args).then(resolve, reject);
      });
    });
    try {
      await page.getByRole('button', { name: 'Add to food history' }).click();
      await page.waitForFunction(() => typeof window.auditReleaseSave === 'function');
      check(!await page.getByRole('button', { name: 'Saving…', exact: true }).isEnabled(), 'Duplicate submission enabled');
      check(!await page.getByRole('button', { name: 'Cancel', exact: true }).isEnabled(), 'Cancel enabled while save pending');
      check(!await page.getByRole('textbox', { name: 'Food name' }).isEnabled(), 'Draft can change during pending save');
      await page.keyboard.press('Escape');
      check(await page.getByRole('dialog').count() === 1, 'Pending dialog dismissed');
    } finally {
      await page.evaluate(async () => {
        navigator.locks.request = window.auditOriginalLock;
        if (window.auditReleaseSave) await window.auditReleaseSave();
        delete window.auditOriginalLock;
        delete window.auditReleaseSave;
      });
    }
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    check((await state()).entries.length === 1, 'Pending save did not complete exactly once');
  });
  return { passed: results.filter(r => r.pass).length, total: results.length, results };
}
