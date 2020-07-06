import './style.css';
import './loaderDualRing.css';
import CustomTicket from './CustomTicket';
import TicketManager from '../util/TicketManager';
import { showNotification_v1 } from '../util/notifications';

let ticketManager = new TicketManager();

var tickets = null;
var date = null;

function refresh() {
    this.setState();
}

/**
 * Convierte una fecha en formato **yyyy-mm-dd** a **dd/mm/yyyy**.
 * @param {String} fecha
 */
function getFixedFecha(fecha) {
    let fixedFecha = fecha.split('-');
    fixedFecha = Number(fixedFecha[2]) + "/" + Number(fixedFecha[1]) + "/" + fixedFecha[0];
    return fixedFecha;
}

/**
 * Función para carga por defecto los tickets del dia actual.
 */
async function init() { //aqui hacer el first load
    if (localStorage.getItem('tickets_first_load') === 'false') {

        localStorage.setItem('tickets_first_load', 'true');
        let fecha = getFixedFecha(date);

        await getTicketsPerDay(fecha, true);

        $('#loader_tickets').hide();
        $('#div_tickets').show();

        refresh();
    }
}

/**
 * Actualiza la lista de tickets desplegada en pantalla.
 */
async function actualizarTickets() {
    let fecha = $('#ticket_fecha').val();
    console.log(fecha);

    $('#loader_tickets').show();
    $('#div_tickets').hide();
    $('#ticket_detalles').hide();

    await getTicketsPerDay(getFixedFecha(fecha));

    $('#loader_tickets').hide();
    $('#div_tickets').show();

    refresh();
}

/**
 * Obtiene todos los tickets correspondientes a la fecha proporcionada.
 * @param {String} fecha 
 */
function getTicketsPerDay(fecha, first_load = false) {
    return new Promise(resolve => {
        let sucursal_id = parseInt($('#selectSucursal').val());
        if (sucursal_id === -1) sucursal_id = Poster.settings.spotId;
        if (first_load) sucursal_id = Poster.settings.spotId;

        $.ajax({
            type: 'POST',
            data: {
                fecha: fecha,
                sucursal: sucursal_id
            },
            url: 'url/getTicketsPerDay.php',
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            crearTarjetas(data);
        }).fail(function (xhr, textStatus, errorThrown) {
            showNotification_v1('info', 'Información', 'No se ha podido obtener respuesta del servidor. Por favor, intente de nuevo.');
        }).always(function () {
            resolve();
        });
    });
}

/**
 * Obtiene todos los tickets correspondientes a los parametros proporcionados en el input.
 */
async function getTicketsPerSearch() {
    if ($('#buscador-ticket').val().trim() === '') return;

    $('#loader_tickets').show();
    $('#div_tickets').hide();
    $('#ticket_detalles').hide();

    await new Promise(resolve => {
        let input = $('#buscador-ticket').val().trim();

        let datos = {
            ticket: '',
            cliente: ''
        };

        if (isNaN(input)) {
            datos.cliente = input;
        } else {
            datos.ticket = input;
        }

        $.ajax({
            type: 'POST',
            data: datos,
            url: 'url/getTicketsPerSearch.php',
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            crearTarjetas(data);
        }).fail(function (xhr, textStatus, errorThrown) {
            showNotification_v1('info', 'Información', 'No se ha podido obtener respuesta del servidor. Por favor, intente de nuevo.');
        }).always(function () {
            resolve();
        });
    });

    $('#loader_tickets').hide();
    $('#div_tickets').show();

    refresh();
}

/**
 * Detecta el ENTER y procede con las busqueda de tickets.
 */
$(document).keyup(function (event) {
    if ($("#buscador-ticket").is(":focus") && event.key == "Enter") {
        getTicketsPerSearch();
    }
});

/**
 * Crea la lista de tickets a mostrar en pantalla.
 * @param {Array} data 
 */
function crearTarjetas(data) {
    tickets = [];
    for (let d in data) {
        tickets.push(<CustomTicket id={data[d].num_ticket} client={data[d].cliente} asesor={data[d].asesor} fecha_venta={data[d].fecha_venta} total={data[d].total} />);
    }
}

/**
 * Imprime la informacion del ticket seleccionado.
 */
async function imprimirTicket() {
    let ticket_id = $('#ticket_id').text();
    ticket_id = ticket_id.split(':');
    ticket_id = ticket_id[1].trim();

    if (ticket_id !== '') {
        $('#ticket_btn').prop('disabled', true);
        $('#loader_ticket_btn').css('display', 'inline-block');
        await ticketManager.reprintTicket(ticket_id, '', $('#desglosado').prop('checked'));
        $('#ticket_btn').prop('disabled', false);
        $('#loader_ticket_btn').hide();
    } else {
        console.log('NO TICKET');
        showNotification_v1('info', 'Información', 'No se ha podido obtener la información del ticket. Intente de nuevo por favor.');
    }
}

export default class Tickets extends React.Component {

    constructor(props) {
        super(props);
        refresh = refresh.bind(this);

        // TODO: Optimizar para no necesitar llamar al reload en esta parte
        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    render() {
        date = new Date().toJSON().slice(0, 10);
        init();
        return (
            <div>
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-sm-4">
                            <div className="row">
                                <div className="col-sm-12 well">
                                    <input className="form-control" type="date" defaultValue={date} onChange={actualizarTickets} id="ticket_fecha" />
                                    <select className="form-control" id="selectSucursal" onChange={actualizarTickets} defaultValue={Poster.settings.spotId}>
                                        <option value="-1">Sucursal</option>
                                        <option value="1">Terranorte</option>
                                        <option value="2">Caucel</option>
                                        <option value="5">Matriz</option>
                                        <option value="0">Todas</option>
                                    </select>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12 well ticket-container">
                                    <div className="lds-dual-ring" id="loader_tickets"></div>
                                    <div id="div_tickets" hidden>
                                        {tickets}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-8">
                            <div className="row well well-sm">
                                <div className="col-sm-9">
                                    <input className="form-control" type="text" id="buscador-ticket" placeholder="Busqueda por ticket, cliente o etiquetas" />
                                </div>
                                <div className="col-sm-2">
                                    <button className="button btn-info" onClick={getTicketsPerSearch}>Buscar</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12">
                                    <div id="loader_ticket_detalles" hidden><div className="lds-dual-ring"></div></div>
                                    <div id="ticket_detalles" hidden>
                                        <p className="ticket-info" id="ticket_id">Ticket:</p>
                                        <p className="ticket-info" id="ticket_asesor">Asesor:</p>
                                        <p className="ticket-info" id="ticket_cliente">Cliente:</p>
                                        <p className="ticket-info" id="ticket_fecha_venta">Fecha venta:</p>
                                        <p className="ticket-info">Productos:</p>
                                        <div id="div_ticket_productos">
                                            <pre><p className="ticket-info" id="ticket_productos"></p></pre>
                                        </div>
                                        <p className="ticket-info" id="ticket_total">Total:</p>
                                        <br />
                                        <div id="div-desglosado-ticket" className="row" style={{ display: 'inline-flex', fontSize: '13pt' }}>
                                            <button className="button btn-success" id="ticket_btn" onClick={imprimirTicket}>Imprimir</button>
                                            <label className="form-check-label" for="desglosado">¿Desglosado?</label>
                                            <input className="form-check-input" style={{ marginLeft: '5px', transform: 'scale(1.5)' }} type="checkbox" id="desglosado" name="desglosado" />
                                        </div>
                                        <div id="loader_ticket_btn" hidden><div className="lds-dual-ring"></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}