import './style.css';
import Swal from 'sweetalert2';
import TicketPrinter from '../util/TicketPrinter';
import { getLonasDescription } from '../util/Util';
import TicketManager from '../util/TicketManager';

var ticketManager = new TicketManager();

let printer = new TicketPrinter();

let data;
let fecha_venta;
let asesor_name, client_name;

function showChangeNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok'
    }).then((result) => {
        if (result.value) {
            if (type === 'success' || needclose === true) Poster.interface.closePopup();
        }
    });
}

function getAsesor() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            return;
        }

        asesor_name = user.name;
        //asesor_id = user.id;
    });
}

function getClient(id) {
    Poster.clients.get(id).then((client) => {
        if (!client) {
            return;
        }
        //_client = client;
        client_name = client.lastname + ' ' + client.firstname + ' ' + client.patronymic;
    });
}

function closeTransaction() {
    console.log('data:', data);

    fecha_venta = new Date().toLocaleDateString();

    if (jQuery.isEmptyObject(data.order.products)) {
        showChangeNotification('info', 'Aviso', 'No puede cerrar ventas en cero.');
        return;
    }

    let inputTrans = Number($('#inputTrans').val());
    let inputCash = Number($('#inputCash').val());
    let inputCard = Number($('#inputCard').val());

    let tag = '&PT:' + inputTrans + ':E=' + inputCash + ':T=' + inputCard + ':' + $('select[id=selectBanco] option:selected').text() + ':' + $('#inputReferencia').val();
    let lona_desc = getLonasDescription(data.order.orderName);
    tag += lona_desc;
    lona_desc = lona_desc.replace('&Lonas#', '');
    lona_desc = lona_desc.replace(/\n/g, '<br>');

    let inputTotal = inputTrans + inputCash + inputCard;

    if (inputTotal != data.order.total) {
        showChangeNotification('error', 'Error', 'El total introducido no corresponde al total a pagar.');
        return;
    }

    $('#btnCloseTrans').prop('disabled', true);

    Poster.orders.setOrderComment(data.order.id, tag);

    Poster.makeApiRequest('transactions.closeTransaction', {
        method: 'post',
        data: {
            spot_id: Poster.settings.spotId,
            spot_tablet_id: Poster.settings.spotTabletId,
            transaction_id: data.order.orderName,
            payed_cash: inputTrans + inputCash,
            payed_card: inputCard
        },
    }, (result) => {
        if (result) {
            console.log('result: ', result);
            $('#btnCloseTrans').prop('disabled', false);
            if (result.err_code === 0) {
                console.log('transaccion cerrada');
                $('#inputTrans').val(0);
                $('#inputCard').val(0);
                $('#inputReferencia').val('');
                $('select[id=selectBanco]').val('Santander');
                showChangeNotification('success', 'Éxito', 'Pago registrado exitosamente.');
                localStorage.setItem('lonas', '');
                Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + data.order.orderName, {
                    method: 'get'
                }, async (productList) => {
                    let datos;
                    datos = {
                        total: data.order.total,
                        importe: 0,
                        adeudo: 0,
                        abono: 0,
                        cash: inputCash,
                        card: inputCard,
                        transfer: inputTrans,
                        change: 0,
                        ticket: data.order.orderName,
                        asesor: asesor_name,
                        cliente: client_name,
                        fecha_venta: fecha_venta,
                        fecha_abono: fecha_venta,
                        fecha_entrega: fecha_venta,
                        detalles: lona_desc
                    };
                    await ticketManager.saveTicket(ticketManager.tipo.VENTA, datos, 0, 0);
                    printer.printReceipt(printer.tipo.VENTA, productList, datos);
                });
            } else {
                showChangeNotification('error', 'Error', 'Un error ha ocurrido. Por favor, intente de nuevo.');
            }
        }
    });
}

export default class PagoTransferencia extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        data = this.props.data;
        getAsesor();
        getClient(data.order.clientId);
        $('#inputTrans').val(data.order.total);
        $('#inputCash').val(0);
        $('#inputCard').val(0);
        console.log('pago transferencias:', data);
        return (
            <div>
                <div className="row">
                    <div className="col-sm-6" id="divTransferencia">
                        <h1>Pago por Transferencia</h1>
                        <h2>Total a pagar: {data.order.total}</h2>
                        <div className="modificadores">
                            <div className="input-group">
                                <span className="input-group-addon">💸 Trans.</span>
                                <input type="number" className="form-control" defaultValue={data.order.total} id="inputTrans" />
                                <span className="input-group-addon">$</span>
                            </div>
                        </div>
                        <div className="modificadores">
                            <div className="input-group">
                                <span className="input-group-addon">💵 Efect.</span>
                                <input type="number" className="form-control" defaultValue={0} id="inputCash" />
                                <span className="input-group-addon">$</span>
                            </div>
                        </div>
                        <div className="modificadores">
                            <div className="input-group">
                                <span className="input-group-addon">💳 Tarjeta</span>
                                <input type="number" className="form-control" defaultValue={0} id="inputCard" />
                                <span className="input-group-addon">$</span>
                            </div>
                        </div>
                        <br />
                        <div id="divSelectBanco">
                            Banco que recibe la transferencia:
                            <select className='form-control' id='selectBanco'>
                                <option value="Santander">Santander</option>
                                <option value="Banorte">Banorte</option>
                            </select>
                        </div>
                        <br />
                        <div className="input-group" id="divFolioTransferencia">
                            Folio del Depósito:
                            <input type="number" className="form-control" id="inputReferencia" aria-label="..." />
                        </div>
                        <br />
                        <button className="btn btn-success" id="btnCloseTrans" onClick={closeTransaction}>Cerrar venta</button>
                    </div>
                    <div className="col-sm-offset-1 col-sm-5">
                        <img src="url logo" alt="imagen" className="img-circle img-responsive center-block" />
                    </div>
                </div>
            </div>
        );
    }
}