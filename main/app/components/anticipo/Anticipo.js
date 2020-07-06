import './style.css';
import '../reporte/report-loader.css';
import Swal from 'sweetalert2';
import TicketPrinter from '../util/TicketPrinter';
import TicketManager from '../util/TicketManager';
import { getLonasDescription } from '../util/Util';

let printer = new TicketPrinter();
var ticketManager = new TicketManager();

let data;

let anticipo = 0;
let cash = 0, card = 0, transfer = 0, folio = '';
let asesor, asesor_id;

let fecha;

let lona_desc = "";

function getAsesorData() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            return;
        }

        asesor = user.name;
        asesor_id = user.id;
    });
}

async function procesarTicket() {
    await new Promise(resolve => {
        Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + data.order.orderName, {
            method: 'get'
        }, async (productList) => {
            console.log("productos: ", productList);
            let datos = {
                total: data.order.total,
                importe: 0,
                adeudo: data.order.total - anticipo,
                abono: anticipo,
                cash: 0,
                card: 0,
                transfer: 0,
                change: 0,
                ticket: data.order.orderName,
                asesor: asesor,
                cliente: $('#client_ant').text(),
                fecha_venta: fecha,
                fecha_abono: fecha,
                fecha_entrega: '',
                detalles: lona_desc
            };
            await ticketManager.saveTicket(ticketManager.tipo.ANTICIPO, datos, 0, 0);
            printer.printReceipt(printer.tipo.ANTICIPO, productList, datos);
            resolve();
        });
    });
}

function fixInputNumber() {
    let input = document.getElementById('montoAnticipo');
    let val = input.value;
    val = val.match(/^\d+(?:\.\d{0,2})?/);
    input.value = val;
}

function getClient(id) {
    Poster.clients.get(id).then((client) => {
        if (!client) {
            return;
        }

        $('#client_ant').text(client.lastname + ' ' + client.firstname + ' ' + client.patronymic);
    });
}

function cerrarVenta() {
    cash = Math.abs($('#inputEfectivo').val());
    card = Math.abs($('#inputTarjeta').val());
    transfer = Math.abs($('#inputTransfer').val());
    folio = $('#inputFolio').val();

    anticipo = cash + card + transfer;

    if (jQuery.isEmptyObject(data.order.products)) {
        Swal.fire(
            'Aviso',
            'No puede hacer anticipos a ventas vacias.',
            'info'
        );
        return;
    }

    if (anticipo >= data.order.total) {
        Swal.fire(
            'Aviso',
            'El monto del anticipo no puede ser igual o mayor al monto total.',
            'info'
        );
        return;
    }

    if (anticipo === 0 && data.order.total <= 500) {
        if (localStorage.getItem('auth') === '0') {
            $('#btnVentaAnticipo').prop('disabled', true);
            Swal.fire({
                title: '¿Proceder?',
                text: "La venta se registrará como SIN ANTICIPO",
                type: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3c98f7',
                cancelButtonColor: '#d55',
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                fecha = new Date().toLocaleString();
                if (result.value) {
                    $('#loader-anticipo').show();
                    Poster.makeRequest('url/ventas_anticipo.php', {
                        headers: [],
                        method: 'POST',
                        data: {
                            client_id: data.order.clientId,
                            num_ticket: data.order.orderName,
                            monto: data.order.total,
                            nombre_cliente: $('#client_ant').text(),
                            fecha_venta: new Date().toJSON().slice(0, 10),
                            sucursal_id: Poster.settings.spotId,
                            pago_inicial: anticipo,
                            fecha: fecha,
                            asesor: asesor,
                            asesor_id: asesor_id
                        },
                        timeout: 10000
                    }, (answer) => {
                        if (Number(answer.result) === 0 && Number(answer.code) === 200) {
                            let str = "&Venta Anticipo:E=" + cash + ":T=" + card + ":Tr=" + transfer + ":F=" + folio;
                            lona_desc = getLonasDescription(data.order.orderName);
                            str += lona_desc;
                            lona_desc = lona_desc.replace('&Lonas#', '');
                            lona_desc = lona_desc.replace(/\n/g, '<br>');

                            Poster.orders.setOrderComment(data.order.id, data.order.comment + str);
                            Poster.makeApiRequest('transactions.closeTransaction', {
                                method: 'post',
                                data: {
                                    spot_id: Poster.settings.spotId,
                                    spot_tablet_id: Poster.settings.spotTabletId,
                                    transaction_id: data.order.orderName,
                                    payed_cash: cash,
                                    payed_card: card,
                                    payed_cert: (data.order.total - anticipo) + transfer
                                },
                            }, async (result) => {
                                if (result) {
                                    if (result.err_code === 0) {
                                        await procesarTicket();
                                        showNotification('success', 'Éxito', 'Venta registrada con éxito.', true);
                                        localStorage.setItem('lonas', '');
                                    } else {
                                        showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
                                    }
                                }
                            });
                        } else {
                            showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
                        }
                        $('#btnVentaAnticipo').prop('disabled', false);
                        $('#loader-anticipo').hide();
                    });
                } else {
                    $('#btnVentaAnticipo').prop('disabled', false);
                }
            });
        } else {
            let sub_msg = data.order.total !== 0 ? 'monto del anticipo' : 'total de la venta';
            Swal.fire(
                'Aviso',
                'El ' + sub_msg + ' no puede ser cero.',
                'info'
            );
            $('#btnVentaAnticipo').prop('disabled', false);
        }
        return;
    }

    if (anticipo < data.order.total * .5) {
        Swal.fire(
            'Aviso',
            'El monto del anticipo debe ser de al menos el 50% de la venta.',
            'info'
        );
        return;
    }

    fecha = new Date().toLocaleString();

    if (anticipo !== 0 && data.order.total !== 0) {
        Swal.fire({
            title: '¿Proceder?',
            text: "La venta se registrará con un anticipo de $" + anticipo,
            type: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3c98f7',
            cancelButtonColor: '#d55',
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.value) {
                $('#btnVentaAnticipo').prop('disabled', true);
                $('#loader-anticipo').show();
                Poster.makeRequest('url/ventas_anticipo.php', {
                    headers: [],
                    method: 'POST',
                    data: {
                        client_id: data.order.clientId,
                        num_ticket: data.order.orderName,
                        monto: data.order.total,
                        nombre_cliente: $('#client_ant').text(),
                        fecha_venta: new Date().toJSON().slice(0, 10),
                        sucursal_id: Poster.settings.spotId,
                        pago_inicial: anticipo,
                        fecha: fecha,
                        asesor: asesor,
                        asesor_id: asesor_id
                    },
                    timeout: 10000
                }, (answer) => {
                    if (Number(answer.result) === 0 && Number(answer.code) === 200) {
                        let str = "&Venta Anticipo:E=" + cash + ":T=" + card + ":Tr=" + transfer + ":F=" + folio;
                        lona_desc = getLonasDescription(data.order.orderName);
                        str += lona_desc;
                        lona_desc = lona_desc.replace('&Lonas#', '');
                        lona_desc = lona_desc.replace(/\n/g, '<br>');

                        Poster.orders.setOrderComment(data.order.id, data.order.comment + str);
                        Poster.makeApiRequest('transactions.closeTransaction', {
                            method: 'post',
                            data: {
                                spot_id: Poster.settings.spotId,
                                spot_tablet_id: Poster.settings.spotTabletId,
                                transaction_id: data.order.orderName,
                                payed_cash: cash,
                                payed_card: card,
                                payed_cert: (data.order.total - anticipo) + transfer
                            },
                        }, async (result) => {
                            if (result) {
                                if (result.err_code === 0) {
                                    await procesarTicket();
                                    showNotification('success', 'Éxito', 'Venta registrada con éxito.', true);
                                    localStorage.setItem('lonas', '');
                                } else {
                                    showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
                                }
                            }
                        });
                    } else {
                        showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
                    }
                    $('#loader-anticipo').hide();
                    $('#btnVentaAnticipo').prop('disabled', false);
                });
            }
        })
    } else {
        let sub_msg = data.order.total !== 0 ? 'monto del anticipo' : 'total de la venta';
        Swal.fire(
            'Aviso',
            'El ' + sub_msg + ' no puede ser cero.',
            'info'
        )
    }
}

function showNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok',
        allowOutsideClick: false
    }).then((result) => {
        if (result.value) {
            if (needclose === true) Poster.interface.closePopup();
        }
    });
}

export default class Anticipo extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        data = this.props.data;
        getAsesorData();
        getClient(data.order.clientId);
        return (
            <div className="row">
                <div className="col-sm-6">
                    <h1>Venta Anticipo</h1>
                    <div className="contenedor_ant">
                        <h3>Cliente: <p id='client_ant'></p></h3>
                        <h3>{"Monto Total: $" + data.order.total}</h3>
                    </div>
                    <div className="contenedor_ant">
                        <div className="input-group">
                            <span className="input-group-addon">💵 Efectivo</span>
                            <input type="number" className="form-control" min="0" placeholder="0" id="inputEfectivo" />
                            <span className="input-group-addon">$</span>
                        </div>
                    </div>
                    <div className="contenedor_ant">
                        <div className="input-group">
                            <span className="input-group-addon">💳 Tarjeta</span>
                            <input type="number" className="form-control" min="0" placeholder="0" id="inputTarjeta" />
                            <span className="input-group-addon">$</span>
                        </div>
                    </div>
                    <div className="contenedor_ant">
                        <div className="input-group">
                            <span className="input-group-addon">💸 Transf.</span>
                            <input type="number" className="form-control" min="0" placeholder="0" id="inputTransfer" />
                            <span className="input-group-addon">$</span>
                        </div>
                        <div className="input-group">
                            <span className="input-group-addon">📃 Folio</span>
                            <input type="text" className="form-control" id="inputFolio" placeholder="Banco y número de referencia" />
                        </div>
                    </div>
                    <button className="btn btn-success" id="btnVentaAnticipo" onClick={cerrarVenta}>Cerrar venta</button>
                    <div id="loader-anticipo" hidden>
                        <div className="lds-facebook"><div></div><div></div><div></div></div>
                    </div>
                </div>
                <div className="col-sm-6">
                    <img src="url de nuestro logo" alt="imagen" className="img-circle img-responsive center-block" />
                </div>
            </div>
        );
    }
}