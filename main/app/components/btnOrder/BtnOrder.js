import './style.css';

import PagoTransferencia from '../pago-transferencia/PagoTransferencia';
import VentaCredito from '../venta-credito/VentaCredito';
import VentaLonas from '../venta-lonas/VentaLonas';
import VentaAnticipo from '../anticipo/Anticipo';
import Plantillas from '../plantillas/Plantillas';
import Cotizacion from '../cotizacion/Cotizacion';
import { checkModulesVersion } from '../util/notifications';
//import TestDragula from '../btnOrder/TestDragula';
import TestDragula from '../cotizacion/EditorDragula';

const CREDIT_GROUP = Number(localStorage.getItem('credit_group_id'));

let cliente;
let asesor_name, asesor_id;
let data;

let View = null;

function showOption(option) {
    $("#viewOpciones").hide();
    switch (option) {
        case 1:
            View = <VentaCredito data={data} />;
            break;
        case 2:
            View = <PagoTransferencia data={data} />;
            break;
        case 3:
            View = <VentaLonas data={data} />;
            break;
        case 4:
            View = <VentaAnticipo data={data} />;
            break;
        case 5:
            View = <Plantillas data={data} />;
            break;
        case 6:
            View = <Cotizacion data={data} />;
            break;
        case 7:
            View = <TestDragula />;
            break;
    }
    this.setState();
    $('#viewBtnOrderOption').show();
}

function checkEnableCredit() {
    Poster.clients.get(data.order.clientId).then((client) => {
        if (!client) {
            return;
        }
        cliente = client;
        if (client.groupId !== CREDIT_GROUP) {
            $('#btnCredito').prop('disabled', true);
        } else {
            $('#btnCredito').prop('disabled', false);
        }
    });
}

/**
 * Obtiene la información del asesor activo.
 */
function getAsesor() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            asesor_name = "***"
            asesor_id = 7;
            return;
        }

        asesor_name = user.name;
        asesor_id = user.id;
    });
}

export default class BtnOrder extends React.Component {
    constructor(props) {
        super(props);
        showOption = showOption.bind(this);
        Poster.on('afterPopupClosed', () => {
            View = null;
            $('#viewBtnOrderOption').hide();
            $('#viewOpciones').show();
            localStorage.setItem('loaded_plantillas', 'false');            
            location.reload()
        });
    }

    render() {
        data = this.props.data;
        showOption = showOption.bind(this);
        getAsesor();
        checkEnableCredit();
        localStorage.setItem('loaded_plantillas', 'false');
        checkModulesVersion();
        return (
            <div id="viewBtnOrder">
                <div id="viewOpciones">
                    {/*<h1>Otras opciones de pago</h1>
                    <button className="btns btn btn-default" id="btnCredito" onClick={() => showOption(1)}>Crédito</button>
                    <button className="btns btn btn-default" id="btnDeposito" onClick={() => showOption(2)}>Depósito</button>
                    <button className="btns btn btn-default" id="btnAnticipo" onClick={() => showOption(4)}>Anticipo</button>
                    <hr />*/}
                    <h3>Cotizadores</h3>
                    <button className="btns btn btn-default" id="btnVentaLonas" onClick={() => showOption(3)}>Lonas</button>
                    <button className="btns btn btn-default" id="btnCotizacion" onClick={() => { showOption(6) }}>Documento</button>
                    {/*<button className="btns btn btn-default" onClick={() => { showOption(7) }}>Test</button>*/}
                    <hr />
                    <h3>Diseño</h3>
                    <button className="btns btn btn-default" id="btnPlantillas" onClick={() => showOption(5)}>Plantillas</button>
                    <hr />
                    <h3>Enlaces</h3>
                    <a className="btns btn btn-default" href="url documentacion" type="button" target="_blank">Abrir página de documentación</a>
                </div>
                <div id="viewBtnOrderOption">
                    {View}
                </div>

            </div>
        );
    }
}