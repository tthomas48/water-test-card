/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  customElement,
  property,
  CSSResult,
  TemplateResult,
  css,
  PropertyValues,
  internalProperty,
} from 'lit-element';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types

import './editor';

import type { WaterTestCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  BOILERPLATE-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'water-test-card',
  name: 'Water Test Card',
  description: 'A custom card to record the results of manual water tests.',
});

@customElement('water-test-card')
export class WaterTestCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('water-test-card-editor');
  }

  public static getStubConfig(): object {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit-element.polymer-project.org/guide/properties
  @property({ attribute: false }) public hass!: HomeAssistant;
  @internalProperty() private config!: WaterTestCardConfig;
  @internalProperty() private _totalHardness!: String;
  @internalProperty() private _totalChlorine!: String;
  @internalProperty() private _freeChlorine!: String;
  @internalProperty() private _ph!: String;
  @internalProperty() private _totalAlkalinity!: String;
  @internalProperty() private _totalStabilizer!: String;

  // https://lit-element.polymer-project.org/guide/properties#accessors-custom
  public setConfig(config: WaterTestCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'Water Test',
      ...config,
    };
  }

  // https://lit-element.polymer-project.org/guide/lifecycle#shouldupdate
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit-element.polymer-project.org/guide/templates
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }

    return html`
      <ha-card
        .header=${this.config.name}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`Water Test`}
      >
      <div class="card_content">
        <ha-formfield label="Total Hardness(ppm)"><label>Total Hardness(ppm)</label><paper-input name="totalHardness" class="flex" pattern="[0-9.]+"
          .configValue=${"totalHardness"} .value=${this._totalHardness} @value-changed=${this._valueChanged} /></ha-formfield>
        <div class="row"><div class="flex">Total Chlorine(ppm)</div><paper-input name="totalChlorine" class="flex" pattern="[0-9.]+"
          .configValue=${"totalChlorine"} .value=${this._totalChlorine} @value-changed=${this._valueChanged} /></div>
        <div class="row"><div class="flex">Free Chlorine(ppm)</div><paper-input name="freeChlorine" class="flex" pattern="[0-9.]+"/
          .configValue=${"freeChlorine"} .value=${this._freeChlorine} @value-changed=${this._valueChanged} ></div>
        <div class="row"><div class="flex">pH</div><paper-input name="ph" class="flex" pattern="[0-9.]+"
          .configValue=${"ph"} .value=${this._ph} @value-changed=${this._valueChanged} /></div>
        <div class="row"><div class="flex">Total Alkalinity(ppm)</div><paper-input name="totalAlkalinity" class="flex" pattern="[0-9.]+"
          .configValue=${"totalAlkalinity"} .value=${this._totalAlkalinity} @value-changed=${this._valueChanged} /></div>
        <div class="row"><div class="flex">Stabilizer(ppm)</div><paper-input name="totalStabilizer" class="flex" pattern="[0-9.]+"
          .configValue=${"totalStabilizer"} .value=${this._totalStabilizer} @value-changed=${this._valueChanged} /></div>
        <div class="row"><mwc-button label="Save" @click="${this._saveEntities}" raised /></div>
        </div>
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html`
      ${errorCard}
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const configValue = (ev.target as any).configValue;

    this[`_${configValue}`] = ev.detail.value;
  }

  private _sendEntity(name: String, uom: String, state: String) {
    this.hass.callApi('POST', 'states/' + name, {
      state,
      attributes: {
        "unit_of_measurement": uom,
      }
    });
  }

  private _saveEntities(): void {
    if (this._totalHardness != "") {
      this._sendEntity("sensor.water_test_total_hardness", "ppm", this._totalHardness);      
    }
    if (this._totalChlorine != "") {
      this._sendEntity("sensor.water_test_total_chlorine", "ppm", this._totalChlorine);      
    }
    if (this._freeChlorine != "") {
      this._sendEntity("sensor.water_test_free_chlorine", "ppm", this._freeChlorine);      
    }
    if (this._ph != "") {
      this._sendEntity("sensor.water_test_ph", "pH", this._ph);      
    }
    if (this._totalAlkalinity != "") {
      this._sendEntity("sensor.water_test_total_alkalinity", "ppm", this._totalAlkalinity);      
    }
    if (this._totalStabilizer != "") {
      this._sendEntity("sensor.water_test_total_stabilizer", "ppm", this._totalStabilizer);      
    }
    this._showWarning
    
  }

  // https://lit-element.polymer-project.org/guide/styles
  static get styles(): CSSResult {
    return css``;
  }
}
