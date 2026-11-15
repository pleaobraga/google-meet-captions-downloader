export const CAPTIONS_REGION_EN = `
<div role="region" aria-label="Captions" tabindex="0">
  <div class="list">
    <div class="block" id="b1">
      <div class="who"><img src="a.png" alt="" /><div><span>Ana Souza</span></div></div>
      <div class="said"><span>então a gente</span> <span>fecha isso na sexta</span></div>
    </div>
    <div class="block" id="b2">
      <div class="who"><img src="p.png" alt="" /><span>Pedro</span></div>
      <div class="said">combinado</div>
    </div>
  </div>
  <button aria-label="Jump to bottom">↓</button>
</div>`

export const CAPTIONS_REGION_PT = CAPTIONS_REGION_EN.replace(
  'aria-label="Captions"',
  'aria-label="Legendas"'
).replace('aria-label="Jump to bottom"', 'aria-label="Ir para o final"')

export const MEET_IN_CALL_EN = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Turn off captions (c)"></button>
<button aria-label="Leave call"></button>
${CAPTIONS_REGION_EN}`

export const MEET_IN_CALL_PT = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Desativar legendas (c)"></button>
<button aria-label="Sair da chamada"></button>
${CAPTIONS_REGION_PT}`

export const MEET_CAPTIONS_OFF_EN = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Turn on captions (c)"></button>
<button aria-label="Leave call"></button>`

export const MEET_LANDING = `<button aria-label="New meeting">Nova reunião</button>`

export const CAPTIONS_REGION_SEPARATE_AVATAR = `
<div role="region" aria-label="Captions">
  <div class="block" id="b1">
    <div class="avatar"><img src="a.png" alt="" /></div>
    <span class="name">Ana</span>
    <div class="said">oi pessoal</div>
  </div>
</div>`

/** Legendas ligadas, mas ninguém falando: o Meet tira a região da página. */
export const MEET_CAPTIONS_SILENT_EN = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Turn off captions (c)"></button>
<button aria-label="Leave call"></button>`

/** Em chamada sem botão de legendas reconhecível nem região: leitura falhou. */
export const MEET_CAPTIONS_UNREADABLE_EN = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Leave call"></button>`
