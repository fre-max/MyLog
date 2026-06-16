import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ComboField } from '@/components/fields/ComboField'
import type { FormDataState } from '@/lib/tradeForm'

type StepType = 'general' | 'biais' | 'poi' | 'entry' | 'result' | 'custom'

// Props reçues par chaque bloc d'étape
// Permet de synchroniser les états locaux avec le formulaire global du TradeDrawer
interface StepBlockProps {
  number: number
  title: string
  type: StepType
  defaultOpen?: boolean
  formData: FormDataState
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>
}

/**
 * Bloc accordéon représentant une étape de la configuration du trade.
 * Il affiche les formulaires adaptés au type de l'étape et modifie l'état partagé.
 * 
 * Exemple d'utilisation :
 * <StepBlock
 *   number={1}
 *   title="Infos générales"
 *   type="general"
 *   formData={formData}
 *   setFormData={setFormData}
 * />
 */
export function StepBlock({
  number,
  title,
  type,
  defaultOpen = false,
  formData,
  setFormData,
}: StepBlockProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border">
      {/* En-tête cliquable pour ouvrir/fermer l'étape */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className={cn(
          'w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-all',
          open ? 'border-accent bg-accent text-white' : 'border-border2 text-txt3'
        )}>
          {number}
        </div>
        <span className="text-txt text-[13.5px] font-medium flex-1">{title}</span>
        <span className={cn('text-txt3 text-[11px] transition-transform', open && 'rotate-90')}>▶</span>
      </button>

      {/* Contenu de l'étape affiché si ouvert */}
      {open && (
        <div className="px-5 pb-5 pl-[54px]">
          {type === 'general' && <GeneralFields formData={formData} setFormData={setFormData} />}
          {type === 'biais' && <BiaisFields formData={formData} setFormData={setFormData} />}
          {type === 'poi' && <PoiFields formData={formData} setFormData={setFormData} />}
          {type === 'entry' && <EntryFields formData={formData} setFormData={setFormData} />}
          {type === 'result' && <ResultFields formData={formData} setFormData={setFormData} />}
        </div>
      )}
    </div>
  )
}

// ─── COMPOSANTS REUTILISABLES POUR LES CHAMPS ────────────────

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 mb-3">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-txt3 text-[11px] font-medium uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-bg border border-border2 rounded-md text-txt px-3 py-2 text-[13.5px] outline-none focus:border-accent"
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-bg border border-border2 rounded-md text-txt px-3 py-2 text-[13.5px] outline-none focus:border-accent"
    >
      {children}
    </select>
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full bg-bg border border-border2 rounded-md text-txt px-3 py-2 text-[13.5px] outline-none focus:border-accent resize-y min-h-[72px]"
    />
  )
}

// ─── FORMULAIRES D'ÉTAPES SPÉCIFIQUES ────────────────────────

// Met à jour une propriété spécifique du store de formulaire global
// Exemple d'utilisation : updateField('pair', 'EURUSD')
const createFieldUpdater = (setFormData: React.Dispatch<React.SetStateAction<FormDataState>>) => 
  (key: keyof FormDataState, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }))
  }

// Étape 1 : Informations générales du trade (Paire, date, session, heure)
function GeneralFields({ formData, setFormData }: { formData: FormDataState; setFormData: React.Dispatch<React.SetStateAction<FormDataState>> }) {
  const updateField = createFieldUpdater(setFormData)

  return (
    <>
      <FieldGrid>
        <Field label="Paire">
          <Select
            value={formData.pair}
            onChange={(e) => updateField('pair', e.target.value)}
          >
            {['XAUUSD','EURUSD','GBPUSD','NAS100','US30','BTCUSD'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
            <option value="Autre">Autre...</option>
          </Select>
        </Field>
        <Field label="Date backtestée">
          <Input
            type="date"
            value={formData.date_backtested}
            onChange={(e) => updateField('date_backtested', e.target.value)}
          />
        </Field>
        <Field label="Session">
          <Select
            value={formData.session}
            onChange={(e) => updateField('session', e.target.value)}
          >
            {['Asian','London','NY','London/NY'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Heure d'entrée">
          <Input
            type="time"
            value={formData.entry_time}
            onChange={(e) => updateField('entry_time', e.target.value)}
          />
        </Field>
      </FieldGrid>
      <Field label="Direction">
        <div className="flex rounded-md overflow-hidden border border-border2">
          {(['long', 'short'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => updateField('direction', d)}
              className={cn(
                'flex-1 py-2 text-[13px] font-medium transition-colors',
                formData.direction === d && d === 'long' && 'bg-accent/10 text-accent',
                formData.direction === d && d === 'short' && 'bg-[#f08a4f]/10 text-[#f08a4f]',
                formData.direction !== d && 'bg-bg text-txt3'
              )}
            >
              {d === 'long' ? '↑ Long' : '↓ Short'}
            </button>
          ))}
        </div>
      </Field>
    </>
  )
}

// Étape 2 : Analyse du Biais (Direction du biais, Timeframe d'analyse, Raisons)
function BiaisFields({ formData, setFormData }: { formData: FormDataState; setFormData: React.Dispatch<React.SetStateAction<FormDataState>> }) {
  const updateField = createFieldUpdater(setFormData)

  return (
    <>
      <FieldGrid>
        <Field label="Timeframe d'analyse">
          <Select
            value={formData.biais_timeframe}
            onChange={(e) => updateField('biais_timeframe', e.target.value)}
          >
            {['W1','D1','H4','H1','M30','M15'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Direction du biais">
          <Select
            value={formData.biais_direction}
            onChange={(e) => updateField('biais_direction', e.target.value)}
          >
            {['Haussier','Baissier','Neutre / Range'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </FieldGrid>
      <div className="mb-3">
        <Field label="Raisons du biais">
          <ComboField
            fieldKey="biais_reasons"
            placeholder="Ex: BOS haussier H4, liquidités prises..."
            presets={['BOS haussier sur H4','CHoCH baissier confirmé','Liquidités basses prises','Prix au-dessus EQ H4']}
            value={formData.biais_reasons}
            onChange={(val) => updateField('biais_reasons', val)}
          />
        </Field>
      </div>
      <ImagePlaceholder label="Chart biais" />
    </>
  )
}

// Étape 3 : Point d'intérêt / Zone (Type de zone, Timeframe, Confluences)
function PoiFields({ formData, setFormData }: { formData: FormDataState; setFormData: React.Dispatch<React.SetStateAction<FormDataState>> }) {
  const updateField = createFieldUpdater(setFormData)

  return (
    <>
      <FieldGrid>
        <Field label="Timeframe du POI">
          <Select
            value={formData.poi_timeframe}
            onChange={(e) => updateField('poi_timeframe', e.target.value)}
          >
            {['H4','H1','M30','M15','M5','M1'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Type de zone">
          <Select
            value={formData.poi_type}
            onChange={(e) => updateField('poi_type', e.target.value)}
          >
            {['Order Block','FVG','S&R','Liquidity','EQ / Equilibrium','Autre...'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </FieldGrid>
      <div className="mb-3">
        <Field label="Confluences">
          <ComboField
            fieldKey="poi_confluences"
            placeholder="Ex: OB aligné avec 50% du swing..."
            presets={['OB aligné avec 50% du dernier swing','FVG en dessous comme support','Zone premium / discount']}
            value={formData.poi_confluences}
            onChange={(val) => updateField('poi_confluences', val)}
          />
        </Field>
      </div>
      <ImagePlaceholder label="Chart POI" />
    </>
  )
}

// Étape 4 : Détails d'Entrée sur le marché (SL, TP, Setup, Prix, Trailing, Sortie)
function EntryFields({ formData, setFormData }: { formData: FormDataState; setFormData: React.Dispatch<React.SetStateAction<FormDataState>> }) {
  const updateField = createFieldUpdater(setFormData)

  return (
    <>
      <FieldGrid>
        <Field label="Timeframe">
          <Select
            value={formData.entry_timeframe}
            onChange={(e) => updateField('entry_timeframe', e.target.value)}
          >
            {['M15','M5','M1','M30','H1'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Setup / Pattern">
          <ComboField
            fieldKey="entry_setup"
            placeholder="Ex: CHoCH, OB M5..."
            presets={['BOS','CHoCH','Order Block','FVG','Liquidity grab','EMA confluence']}
            value={formData.entry_setup}
            onChange={(val) => updateField('entry_setup', val)}
          />
        </Field>
        <Field label="Prix d'entrée">
          <Input
            type="number"
            step="0.00001"
            placeholder="0.00000"
            value={formData.entry_price}
            onChange={(e) => updateField('entry_price', e.target.value)}
          />
        </Field>
        <Field label="Stop Loss">
          <Input
            type="number"
            step="0.00001"
            placeholder="0.00000"
            value={formData.entry_sl}
            onChange={(e) => updateField('entry_sl', e.target.value)}
          />
        </Field>
        <Field label="Take Profit">
          <Input
            type="number"
            step="0.00001"
            placeholder="0.00000"
            value={formData.entry_tp}
            onChange={(e) => updateField('entry_tp', e.target.value)}
          />
        </Field>
        <Field label="Trailing Stop">
          <Input
            type="text"
            placeholder="ex: 20 pips"
            value={formData.entry_trailing}
            onChange={(e) => updateField('entry_trailing', e.target.value)}
          />
        </Field>
        <Field label="R:R prévu">
          <Input
            type="number"
            step="0.1"
            placeholder="2.0"
            value={formData.rr_planned}
            onChange={(e) => updateField('rr_planned', e.target.value)}
          />
        </Field>
        <Field label="Sortie via">
          <Select
            value={formData.exit_type}
            onChange={(e) => updateField('exit_type', e.target.value as any)}
          >
            {[
              { key: 'tp', label: 'TP atteint' },
              { key: 'sl', label: 'SL atteint' },
              { key: 'breakeven', label: 'Breakeven' },
              { key: 'trailing', label: 'Trailing Stop' },
              { key: 'manual', label: 'Sortie manuelle' },
            ].map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </Select>
        </Field>
      </FieldGrid>
      <div className="mb-3">
        <Field label="Raisons de l'entrée">
          <ComboField
            fieldKey="entry_reasons"
            placeholder="Ex: CHoCH M5 sur le POI..."
            presets={["CHoCH M5 confirmé sur le POI","Bougie englobante haussière","Retest du bris de structure","Confluences multiples alignées"]}
            value={formData.entry_reasons}
            onChange={(val) => updateField('entry_reasons', val)}
          />
        </Field>
      </div>
      <ImagePlaceholder label="Chart entrée" />
    </>
  )
}

// Étape 5 : Résultat, émotions et revue écrite
function ResultFields({ formData, setFormData }: { formData: FormDataState; setFormData: React.Dispatch<React.SetStateAction<FormDataState>> }) {
  const updateField = createFieldUpdater(setFormData)

  const buttons: { key: 'win' | 'loss' | 'breakeven'; label: string }[] = [
    { key: 'win', label: '✓ Win' },
    { key: 'loss', label: '✗ Loss' },
    { key: 'breakeven', label: '— Breakeven' },
  ]
  const colors = {
    win: 'border-win bg-win/10 text-win',
    loss: 'border-loss bg-loss/10 text-loss',
    breakeven: 'border-be bg-be/10 text-be',
  }

  return (
    <>
      <div className="mb-3">
        <label className="text-txt3 text-[11px] font-medium uppercase tracking-wider block mb-1.5">Résultat</label>
        <div className="flex gap-2">
          {buttons.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateField('result', key)}
              className={cn(
                'flex-1 py-2 rounded-md border-[1.5px] text-[12.5px] font-medium transition-all',
                formData.result === key ? colors[key] : 'border-border2 bg-bg text-txt3'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <FieldGrid>
        <Field label="R:R réalisé">
          <Input
            type="number"
            step="0.1"
            placeholder="0.0"
            value={formData.rr_realized}
            onChange={(e) => updateField('rr_realized', e.target.value)}
          />
        </Field>
        <Field label="État émotionnel">
          <Select
            value={formData.emotion}
            onChange={(e) => updateField('emotion', e.target.value)}
          >
            <option value="">Sélectionner...</option>
            {['Discipliné','Confiant','FOMO','Impatient','Revenge','Hésitant','Neutre','Focalisé'].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </Field>
      </FieldGrid>
      <div className="flex flex-col gap-3">
        <Field label="Ce que j'ai bien fait">
          <Textarea
            placeholder="..."
            value={formData.review_good}
            onChange={(e) => updateField('review_good', e.target.value)}
          />
        </Field>
        <Field label="À améliorer">
          <Textarea
            placeholder="..."
            value={formData.review_bad}
            onChange={(e) => updateField('review_bad', e.target.value)}
          />
        </Field>
      </div>
    </>
  )
}

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-accent/5 border border-accent/15 rounded-md text-[12px] text-txt3">
        <span>📱</span>
        <span>Récupérer depuis Telegram Bot</span>
        <span className="ml-auto text-accent text-[11px] cursor-pointer hover:underline">→ Configurer</span>
      </div>
      <div className="mt-1 border-2 border-dashed border-border2 rounded-md py-4 text-center text-txt3 text-[12px] cursor-pointer hover:border-accent hover:text-accent transition-colors">
        🖼 Glisser ou coller une image
      </div>
    </Field>
  )
}
