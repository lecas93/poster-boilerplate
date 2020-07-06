import '../venta-credito/sk-cube.css';
import '../util/style.css';
import Swal from 'sweetalert2';
import TicketPrinter from './TicketPrinter';
import TicketManager from './TicketManager';
import { showNotification_v1 } from '../util/notifications';
import { sendEmailNotification } from '../util/notifications';

let ticket_data = null;

let printer = new TicketPrinter();
let ticketManager = new TicketManager();
let tipoTicket;

let url_list = '';
let url_pago = '';
let category_id = 0;

let numTicket;
let pagosTicket;
let tablePagos;

let asesor = '';
let asesor_id = 0;

let total = 0;
let importe = 0;
let adeudo = 0;

let cash = 0;
let card = 0;
let transfer = 0;
let folio = '';
let abono = 0;

let archivos = undefined;

let id_pago = 0;

let nombreCliente = "";
let descuento_cliente = 0;

function refresh() {
    this.setState();
}

/**
 * Formatea un número para mostrar la cantidad de puntos decimales deseados.
 * 
 * @param {Number} value El número o valor a ser formateado.
 * @param {Number} n La cantidad de puntos decimales a mostrar.
 * @returns {String} Una cadena que contiene el valor proporcionado con el formato aplicado.
 */
function toFixedTrunc(value, n) {
    const v = value.toString().split('.');
    if (n <= 0) return v[0];
    let f = v[1] || '';
    if (f.length > n) return `${v[0]}.${f.substr(0, n)}`;
    while (f.length < n) f += '0';
    return `${v[0]}.${f}`
}

/**
 * Establece el tipo de pago. Puede ser **credito** o **anticipo**.
 * @param {String} tipo 
 */
function setTipoPago(tipo) {
    switch (tipo) {
        case 'credito':
            url_list = 'creditos_cliente';
            url_pago = 'pago_credito';
            category_id = 14; //14
            tipoTicket = ticketManager.tipo.CREDITO;
            break;
        case 'anticipo':
            url_list = 'anticipos_cliente';
            url_pago = 'pago_anticipo';
            category_id = 16; //16
            tipoTicket = ticketManager.tipo.ANTICIPO;
            break;
    }
}

function ocultar() {
    $('#loaderPagosManager').show();
    $('#pagos-Manager').hide();
    $('#headerPM').hide();
    $('#divTablePM').hide();
    $('#divBtnNewPaid').hide();
}

function mostrar() {
    $('#loaderPagosManager').hide();
    $('#pagos-Manager').show();
    $('#headerPM').show();
    $('#divTablePM').show();
    $('#divBtnNewPaid').show();
}

/**
 * Obtiene la lista de pagos realizados a un ticket.
 */
function getPagos() {
    if (localStorage.getItem('alreadyLoaded') === 'true') return;
    ocultar();

    $.ajax({
        type: 'POST',
        data: {
            client_id: 0,
            estado: 3,
            num_ticket: numTicket
        },
        url: 'url' + url_list + '.php',
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        pagosTicket = data;
        tablePagos = createTable();
    }).fail(function (xhr, textStatus, errorThrown) {
        showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
    }).always(function () {
        mostrar();
        if (adeudo === 0) $('#divBtnNewPaid').hide();
        refresh();
        localStorage.setItem('alreadyLoaded', 'true');
        $('#clientAdeudo').text(nombreCliente);
    });
}

/**
 * Crea la tabla con la lista de pagos de un ticket.
 */
function createTable() {
    let table = [];
    adeudo = 0;
    importe = 0;

    let num_orders = pagosTicket.length;
    if (num_orders !== 0) {
        total = parseFloat(pagosTicket[0].monto);
        importe = 0;
        for (let i = 0; i < num_orders; i++) {
            let children = [];
            children.push(<td hidden>{pagosTicket[i].id_pago}</td>);
            children.push(<td>${pagosTicket[i].abono}</td>);
            children.push(<td>{pagosTicket[i].fecha_pago}</td>);
            children.push(<td>{pagosTicket[i].asesor}</td>);
            children.push(<td><button className="btn btn-success btn-ticket" onClick={() => printTicket(pagosTicket[i].id_pago)}>Ticket</button></td>);
            table.push(<tr>{children}</tr>);

            importe += Number(pagosTicket[i].abono);
        }

        importe = parseFloat(toFixedTrunc(importe, 2));

        adeudo = total - importe;
    } else {
        adeudo = total;
    }

    adeudo = parseFloat(adeudo);
    console.log('ADEUDO', adeudo);
    if (adeudo > 1) adeudo = parseFloat(adeudo.toFixed(2));

    return table;
}

async function printTicket(pagoID) {
    console.log(numTicket);
    console.log(pagoID);
    $('.btn-ticket').prop('disabled', true);
    await ticketManager.reprintTicket(numTicket, pagoID);
    $('.btn-ticket').prop('disabled', false);
}

function subirComprobante() {
    return new Promise(resolve => {
        let files = archivos;

        let len = files.length;

        let datos = new FormData();

        datos.append('num_ticket', numTicket);
        //data.append('fecha_venta', fecha_venta);
        //data.append('subject', subject);
        //data.append('message', message);

        for (let i = 0; i < len; i++) {
            datos.append('file-' + i, files[i]);
        }

        $.ajax({
            url: 'url/Pos/subir_comprobante',
            data: datos,
            cache: false,
            contentType: false,
            processData: false,
            method: 'POST'
            //type: 'POST'
        }).done(function (data) {
            console.log(data);
            if (data.status !== 0) {
                showNotification_v1('error', 'Status: ' + data.status, data.message);
            }
            resolve();
        }).fail(function (xhr, textStatus, errorThrown) {
            console.error(xhr.responseText);
            showNotification_v1('error', 'Error', 'No se ha podido guardar el comprobante en servidor. Favor de enviarlo manualmente a: email');
            resolve();
        });
    });
}

/**
 * Despliega el modal para registrar un nuevo pago.
 */
function registrarPago() {
    let html = '<div class="input-group"><div class="input-group-addon">💵 Efectivo</div><input type="number" min="0" class="form-control" id="inputCash" placeholder="0.00"></div>';
    html += '<div class="input-group"><div class="input-group-addon">💳 Tarjeta</div><input type="number" min="0" class="form-control" id="inputCard" placeholder="0.00"></div>';
    html += '<div class="input-group"><div class="input-group-addon">💸 Transferancia</div><input type="number" min="0" class="form-control" id="inputTransfer" placeholder="0.00"></div>';
    html += '<div class="input-group"><div class="input-group-addon">📃 Folio</div><input type="text" class="form-control" id="inputFolio"></div>';
    html += '<div class="input-group"><div class="input-group-addon">Comprobante</div><input type="file" multiple class="form-control" id="inputArchivos"></div>';
    Swal.fire({
        title: 'Ingrese la cantidad a abonar',
        html: html,
        showCancelButton: true,
        confirmButtonText: 'Registrar',
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false
    }).then((result) => {
        console.log(result);
        if (result.value) {
            cash = Math.abs($('#inputCash').val());
            card = Math.abs($('#inputCard').val());
            transfer = Math.abs($('#inputTransfer').val());
            folio = $('#inputFolio').val();
            abono = cash + card + transfer;
            abono = parseFloat(abono.toFixed(2));

            if ($('#inputArchivos').val() !== '') archivos = $('#inputArchivos')[0].files;

            if (transfer > 0 && $('#inputArchivos').val() === '') {
                showNotification_v1('info', 'Aviso', 'Debe proporcionar el comprobante para el abono por transferencia.');
                return;
            }

            if (abono !== 0) {
                if (abono <= adeudo) {
                    sendPaidToServer();
                } else {
                    showNotification('info', 'Abono excedente', 'La cantidad a registrar no puede ser mayor al adeudo pendiente. Por favor, intente de nuevo.');
                }
            } else {
                showNotification('info', 'Campo vacío', 'No puede dejar el campo vacío. Por favor, intente de nuevo.');
            }
        }
    })
}

/**
 * Envia la informacion proporcionada para registrar un nuevo pago.
 */
function sendPaidToServer() {
    Swal.fire({
        title: 'Procesando',
        timer: 1000,
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
            Swal.stopTimer();
            let fecha = new Date().toLocaleString();

            let _datos = {
                num_ticket: numTicket,
                fecha: fecha,
                abono: abono,
                cash: cash,
                card: card,
                transfer: transfer,
                folio: folio,
                asesor: asesor,
                asesor_id: asesor_id
            };

            $.ajax({
                type: 'POST',
                data: _datos,
                url: 'url' + url_pago + '.php',
                dataType: 'json',
                encoded: true
            }).done(async function (data) {
                console.log('DATA PAGO', data);
                id_pago = data;
                if (id_pago !== -1 && id_pago !== -2) {
                    let spotId = Number(Poster.settings.spotId);
                    let account_to = 0;
                    switch (spotId) {
                        case 1:
                            account_to = 6;
                            break;
                        case 2:
                            account_to = 4;
                            break;
                        case 5:
                            account_to = 5;
                            break;
                    }

                    let date_no_efectivo = fecha.split(' ');
                    let hora = date_no_efectivo[1];

                    let now = new Date();
                    let year = now.getFullYear();
                    let month = now.getMonth() + 1;
                    let day = now.getDate();
                    if (month < 10) {
                        month = "0" + month;
                    }
                    if (day < 10) {
                        day = "0" + day;
                    }

                    date_no_efectivo = day + "" + month + "" + year;

                    let time = hora.split(':');
                    let h = time[0];
                    let m = time[1];
                    if (parseInt(h) < 10) h = "0" + h;
                    let date_efectivo = year + "-" + month + "-" + day + " " + h + ":" + m;

                    let comentario_efectivo = 'Abono de Ticket: #' + numTicket + ',';
                    comentario_efectivo += ' Asesor: ' + asesor + ',';
                    comentario_efectivo += ' Hora: ' + hora + ',';
                    comentario_efectivo += 'E:' + cash + ', T:0.00' + ', Tr:0.00' + ', F:';

                    let comentario_no_efectivo = 'Abono de Ticket: #' + numTicket + ',';
                    comentario_no_efectivo += ' Asesor: ' + asesor + ',';
                    comentario_no_efectivo += ' Hora: ' + hora + ',';
                    comentario_no_efectivo += 'E:0.00' + ', T:' + card + ', Tr:' + transfer + ', F:' + folio;

                    /*let comentario = 'Abono de Ticket: #' + numTicket + ',';
                    comentario += ' Asesor: ' + asesor + ',';
                    comentario += ' Hora: ' + hora + ',';
                    comentario += 'E:' + cash + ', T:' + card + ', Tr:' + transfer + ', F:' + folio;*/

                    /*
                    console.log(category_id);
                    console.log(asesor_id);
                    console.log(abono);
                    console.log(account_to);
                    console.log(date);
                    console.log(comentario);
                    */
                    if (transfer > 0) await subirComprobante();

                    /*await new Promise(resolve => {
                        console.log('REGISTRANDO ABONO EN POSTER');
                        let data = {
                            type: 1,
                            category: category_id,
                            user_id: asesor_id,
                            amount_to: abono,
                            account_to: account_to,
                            date: date,
                            comment: comentario
                        };
                        console.log(data);
                        Poster.makeApiRequest('finance.createTransactions', {
                            method: 'POST',
                            data: data
                        }, (result) => {
                            console.log("resultado finance:", result);
                            resolve();
                        });
                    });*/

                    if (cash > 0) await registrarPagoEfectivo(cash, date_efectivo, comentario_efectivo);
                    if (card + transfer > 0) await registrarPagoNoEfectivo(parseFloat((card + transfer).toFixed(2)), account_to, date_no_efectivo, comentario_no_efectivo);

                    // obtenemos fecha de entrega
                    let fechaEntrega = "";
                    await new Promise(resolve => {
                        $.ajax({
                            type: 'POST',
                            data: { num_ticket: numTicket },
                            url: 'url/get_ticket.php',
                            dataType: 'json',
                            encoded: true
                        }).done(function (data) {
                            console.log('FECHA ENTREGA', data);
                            if (data.length !== 0) {
                                fechaEntrega = data[0].fecha_entrega;
                            }
                            resolve();
                        }).fail(function (xhr, textStatus, errorThrown) {
                            console.error(xhr);
                            console.error(textStatus);
                            console.error(errorThrown);
                            try {
                                sendEmailNotification('Error al obtener fecha de entrega de un ticket', Poster.settings.spotId, xhr.responseText);
                            } catch (error) {
                                console.error('Error al enviar reporte. Lugar: get_ticket en PagosManager', error);
                            }
                            resolve();
                        });
                    });
                    //
                    await new Promise(resolve => {
                        Poster.makeApiRequest('dash.getTransaction?&include_history=false&include_products=false&timezone=client&transaction_id=' + numTicket, {
                            method: 'GET'
                        }, (result) => {
                            console.log('RESULT:', result);
                            let fecha_venta = result[0].date_close_date;
                            Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + numTicket, {
                                method: 'get'
                            }, (productList) => {
                                console.log("PRODUCTOSSSS: ", productList);
                                let data = {
                                    total: total,
                                    importe: importe,
                                    adeudo: adeudo,
                                    abono: abono,
                                    cash: cash,
                                    card: card,
                                    transfer: transfer,
                                    change: 0,
                                    ticket: numTicket,
                                    asesor: asesor,
                                    cliente: nombreCliente,
                                    fecha_venta: fecha_venta,
                                    fecha_abono: fecha,
                                    fecha_entrega: fechaEntrega,
                                    detalles: '',
                                    tag: ticket_data.tags,
                                    json: ticket_data.json,
                                    descuento_cliente: ticket_data.descuento_cliente
                                };
                                ticketManager.saveTicket(ticketManager.tipo.ABONO, data, id_pago, 1);
                                printer.printReceipt(printer.tipo.ABONO, productList, data);
                                resolve();
                            });
                        });
                    });
                    showNotification('success', 'Éxito', 'El pago ha sido registrado con éxito.', true);
                }
            }).fail(function (xhr, textStatus, errorThrown) {
                showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.', true);
                sendEmailNotification('Error al registrar pago', Poster.settings.spotId, JSON.stringify(_datos));
            }).always(function () {
                //Swal.resumeTimer();
            });
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
            console.log('proceso terminado');
            Poster.interface.closePopup();
        }
    });
}

/**
 * Registra en poster la parte del pago que no es efectivo.
 * @param {Number} amount El abono a registrar
 * @param {Number} account_to El ID de la cuenta donde registrar el abono.
 * @param {String} date La fecha del pago en formato **ddmmyyyy**
 * @param {String} comentario La descripción del pago.
 */
function registrarPagoNoEfectivo(amount, account_to, date, comentario) {
    return new Promise(resolve => {
        // https://dev.joinposter.com/en/docs/v3/web/finance/createTransactions
        console.log('REGISTRANDO ABONO EN POSTER');
        let data = {
            type: 1,
            category: category_id,
            user_id: asesor_id,
            amount_to: amount,
            account_to: account_to,
            date: date,
            comment: comentario
        };
        console.log(data);
        Poster.makeApiRequest('finance.createTransactions', {
            method: 'POST',
            data: data
        }, (result) => {
            console.log("resultado finance:", result);
            resolve();
        });
    });
}

/**
 * Registra en poster la parte del pago que es efectivo.
 * @param {Number} cash El efectivo abonado.
 * @param {String} time La fecha y hora de la transacción en formato **yyyy-mm-dd hh:mm**.
 * @param {String} comentario La descripción del pago.
 */
function registrarPagoEfectivo(cash, time, comentario) {
    return new Promise(async resolve => {
        let current_cash_shift_id = await getCurrentCashShift();

        // https://dev.joinposter.com/en/docs/v3/web/finance/createCashShiftTransaction
        console.log('REGISTRANDO PAGO EN POSTER');
        let data = {
            cash_shift_id: current_cash_shift_id,
            type_id: 2,
            category_id: category_id,
            user_id: asesor_id,
            amount: cash,
            time: time,
            comment: comentario
        };
        console.log(data);
        Poster.makeApiRequest('finance.createCashShiftTransaction', {
            method: 'POST',
            data: data
        }, (result) => {
            console.log("resultado finance:", result);
            resolve();
        });
    });
}

/**
 * Obtiene el id del cash shift abierto en la sucursal correspondiente.
 */
function getCurrentCashShift() {
    return new Promise(async resolve => {
        let now = new Date();

        let year = now.getFullYear();
        let month = now.getMonth() + 1;
        let day = now.getDate();

        if (month < 10) {
            month = "0" + month;
        }

        if (day < 10) {
            day = "0" + day;
        }

        // obtener lista de cash shifts
        function getCashShift(year, month, day) {
            let dateFrom = year + "" + month + "" + day;
            console.log(dateFrom);
            return new Promise(resolve => {
                Poster.makeApiRequest('finance.getCashShifts?dateFrom=' + dateFrom + '&spot_id=' + Poster.settings.spotId, {
                    method: 'get'
                }, async (result) => {
                    if (result.length !== 0) {
                        let cash_shift_sucursal = result.find((item) => {
                            return item.spot_id === "" + Poster.settings.spotId && item.timeend === '0';
                        });

                        if (cash_shift_sucursal.length !== 0) {
                            resolve(cash_shift_sucursal);
                        } else {
                            month -= 1;
                            if (month < 10) month = "0" + month;
                            resolve(getCashShift(year, month, day));
                        }
                    } else {
                        month -= 1;
                        if (month < 10) month = "0" + month;
                        resolve(getCashShift(year, month, day));
                    }
                });
            });
        }

        let cash_shift = await getCashShift(year, month, day);
        console.log('CASH SHIFT', cash_shift);

        resolve(cash_shift.cash_shift_id);
    });
}

/**
 * Muestra un cuadro de dialogo del tipo y mensaje proporcionado.
 * @param {String} type El tipo de modal. Puede ser **success**, **error**, **question**, **warning** o **info**.
 * @param {String} title El texto que se mostrara en la barra de titulo del modal.
 * @param {String} text  El texto contenido en el cuerpo del modal.
 * @param {Boolean} needclose Indica si debe ser cerrada la ventana de Poster junto al modal. **False** por defecto.
 */
function showNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok'
    }).then((result) => {
        if (result.value) {
            if (needclose === true) Poster.interface.closePopup();
        }
    });
}

/**
 * Obtiene el ID y nombre del asesor activo.
 */
function getAsesorData() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            return;
        }

        asesor = user.name;
        asesor_id = user.id;
    });
}

export default class PagosManager extends React.Component {
    constructor(props) {
        super(props);
        console.log('pagos manager creado');
        refresh = refresh.bind(this);

        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    render() {
        console.log('num ticket desde PAGOS MANAGER:', this.props.data.num_ticket);
        ticket_data = this.props.data;
        numTicket = this.props.data.num_ticket;
        total = this.props.data.monto;
        setTipoPago(this.props.tipo);
        nombreCliente = this.props.data.nombre_cliente;
        descuento_cliente = this.props.descuento;
        getAsesorData();
        getPagos();
        $('#pagos-Manager').show();
        return (
            <div>
                <div id="loaderPagosManager">
                    <div className="sk-cube-grid">
                        <div className="sk-cube sk-cube1"></div>
                        <div className="sk-cube sk-cube2"></div>
                        <div className="sk-cube sk-cube3"></div>
                        <div className="sk-cube sk-cube4"></div>
                        <div className="sk-cube sk-cube5"></div>
                        <div className="sk-cube sk-cube6"></div>
                        <div className="sk-cube sk-cube7"></div>
                        <div className="sk-cube sk-cube8"></div>
                        <div className="sk-cube sk-cube9"></div>
                    </div>
                </div>
                <div id="pagos-Manager" hidden>
                    <div id="headerPM" hidden>
                        <p>Ticket: {this.props.numTicket}</p>
                        <p>Total: ${total}</p>
                        <p>Pagado: ${importe.toFixed(2)}</p>
                        <p>Adeudo: ${adeudo.toFixed(2)}</p>
                    </div>
                    <div id="divTablePM" hidden>
                        <table>
                            <thead>
                                <tr>
                                    <th>Abono</th>
                                    <th>Fecha</th>
                                    <th>Asesor</th>
                                    <th>Gestión</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tablePagos}
                            </tbody>
                        </table>
                    </div>
                    <div id="divBtnNewPaid" hidden>
                        <button id="btnNewPaidPM" className="btn btn-success" onClick={registrarPago}>Nuevo Pago</button>
                    </div>
                </div>
            </div>
        );
    }
}