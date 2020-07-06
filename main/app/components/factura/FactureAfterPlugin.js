import './style-facture-after.css';
import Swal from 'sweetalert2';
import ErrorAviso from '../aviso/ErrorAviso';
import { showNotification_v1 } from '../util/notifications';
import { showNotification } from '../util/notifications';

let response;
let data;
let _client;
let clientId;
let fecha_venta = "";

/**
 * Envia el correo con la información para la solicitud de facturación.
 * @param {String} subject Titulo del correo
 * @param {String} message Cuerpo del correo
 * @deprecated
 */
function enviarCorreo(subject, message) {
    let files = $('#factura-archivos')[0].files;

    let len = files.length;

    let data = new FormData();

    data.append('num_ticket', $('#inputTicket').val().trim());
    data.append('fecha_venta', fecha_venta);
    data.append('subject', subject);
    data.append('message', message);

    for (let i = 0; i < len; i++) {
        data.append('file-' + i, files[i]);
    }

    Swal.fire({
        title: 'Enviando...',
        allowOutsideClick: false,
        timer: 1000,
        onBeforeOpen: async () => {
            Swal.showLoading();
            Swal.stopTimer();

            $.ajax({
                url: 'url/Pos/enviar_solicitud_facturacion',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                type: 'POST'
            }).done(function (data) {
                console.log(data);
                if (data.status === 0) {
                    resetInputs();
                    Swal.resumeTimer();
                } else {
                    showNotification('error', 'Status: ' + data.status, data.message);
                    $('#btnFacturar').prop('disabled', false);
                }
            }).fail(function (xhr, textStatus, errorThrown) {
                //console.error(xhr.responseText);
                if (xhr.responseText.includes('Duplicate entry')) {
                    showNotification('error', 'Ticket Duplicado', 'Este ticket ya se ha mando a facturar antes. Por favor verifique su número de ticket.');
                } else {
                    showNotification('error', 'Error', xhr.responseText);
                }
                $('#btnFacturar').prop('disabled', false);
            });
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
            console.log('proceso terminado');
            showNotification_v1('success', 'Solicitud enviada');
        }
    });
}

/**
 * Envia el correo con la información para la solicitud de facturación.
 * @param {String} subject Titulo del correo
 * @param {String} message Cuerpo del correo
 * @param {String} fechas_ventas Fechas de la venta de cada ticket
 */
function enviarCorreo_v2(subject, message, fechas_ventas, tickets) {
    let files = $('#factura-archivos')[0].files;

    let len = files.length;

    let data = new FormData();

    data.append('tickets', tickets);
    data.append('fechas_ventas', fechas_ventas);
    data.append('subject', subject);
    data.append('message', message);

    for (let i = 0; i < len; i++) {
        data.append('file-' + i, files[i]);
    }

    Swal.fire({
        title: 'Enviando...',
        allowOutsideClick: false,
        timer: 1000,
        onBeforeOpen: async () => {
            Swal.showLoading();
            Swal.stopTimer();

            $.ajax({
                url: 'url/Pos/enviar_solicitud_facturacion',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                type: 'POST'
            }).done(function (data) {
                console.log(data);
                if (data.status === 0) {
                    resetInputs();
                    Swal.resumeTimer();
                } else {
                    showNotification('error', 'Status: ' + data.status, data.message);
                }
            }).fail(function (xhr, textStatus, errorThrown) {
                //console.error(xhr.responseText);
                showNotification('error', 'Error', xhr.responseText);
            }).always(function () {
                $('#btnFacturar').prop('disabled', false);
            });
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
            console.log('proceso terminado');
            showNotification_v1('success', 'Solicitud enviada');
        }
    });
}

//#endregion

/**
 * Manda al servidor la informacion necesaria para realizar la solicitud de factura de un ticket.
 * @deprecated desde implementacion de ventana propia.
 */
function facturar() {
    if ($('#inputTicket').val().trim() === '') {
        showChangeNotification('error', '¡Error!', 'Debe proporcionar un número de ticket.');
        return;
    }
    $('#btnFacturar').prop('disabled', true);
    Poster.makeRequest('url/facturarAfter.php', {
        headers: [],
        method: 'POST',
        data: {
            transactionId: $('#inputTicket').val(),
            clientRFC: $('select[id=selectRFC2] option:selected').text(),
            clientName: $('#txtName').val(),
            clientPhone: $('#txtTelefono').val(),
            clientAddress: $('#txtAddress').val(),
            clientEmail: $('#txtEmail').val(),
            clientTarjeta: $('select[id=selectTarjeta] option:selected').text(),
            clientCFDI: $('select[id=selectCFDI] option:selected').val() + '-' + $('select[id=selectCFDI] option:selected').text(),
            clientObservations: $('#facturaObservaciones').val()
        },
        timeout: 10000
    }, (answer) => {
        console.log('mod answer: ', answer);
        //console.log('json mod answer: ', JSON.parse(answer.result));
        if (answer && Number(answer.code) === 200) {
            if (Number(answer.result) === 0) {
                $('#btnFacturar').prop('disabled', false);
                $('#inputTicket').val('');
                showChangeNotification('success', '¡Éxito!', 'Solicitud de facturación enviada con éxito.');
            } else {
                showChangeNotification('error', 'Oops...', 'Ha ocurrido un error. Por favor, intente de nuevo.');
            }
        } else {
            showChangeNotification('error', '¡Sin conexión!', 'No se ha recibido ninguna respuesta del servidor. Intente de nuevo.');
        }
        $('#btnFacturar').prop('disabled', false);
    });
}

/**
 * Genera la solicitud de factura y la manda a traves de nuestro servidor.
 * @deprecated
 */
function facturar_v2() {
    if ($('#inputTicket').val().trim() === '') {
        showChangeNotification('info', 'Aviso', 'Debe proporcionar un número de ticket.');
        return;
    }

    if ($('select[id=selectTarjeta] option:selected').val() === '0') {
        showChangeNotification('info', 'Aviso', 'Debe escoger una opción para el campo TARJETA.');
        return;
    }

    if ($('select[id=selectCFDI] option:selected').val() === '0') {
        showChangeNotification('info', 'Aviso', 'Debe escoger una opción para el campo CFDI.');
        return;
    }

    $('#btnFacturar').prop('disabled', true);

    let venta, productos;

    let query = '&transaction_id=' + $('#inputTicket').val().trim() +
        '&timezone=client&include_history=false&include_products=false';

    Poster.makeApiRequest('dash.getTransaction?' + query, {
        method: 'get'
    }, (transaction) => {
        console.log("transaction: ", transaction);
        venta = transaction;

        Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + $('#inputTicket').val().trim(), {
            method: 'get'
        }, async (productList) => {
            console.log("productos: ", productList);
            productos = productList;

            let fecha_venta = "";

            if (venta[0].date_close_date !== null && venta[0].date_close_date !== undefined) {
                fecha_venta = venta[0].date_close_date.split(' ');
                fecha_venta = fecha_venta[0];
            } else {
                showNotification_v1('info', 'Aviso', 'El ticket ingresado no existe o la venta no ha sido cerrada aún.');
                $('#btnFacturar').prop('disabled', false);
                return;
            }

            let sucursal = '';
            switch (Number(venta[0].spot_id)) {
                case 1:
                    sucursal = 'Terranorte';
                    break;
                case 2:
                    sucursal = 'Caucel';
                    break;
                case 5:
                    sucursal = 'Matriz';
                    break;
                default:
                    sucursal = 'Sin nombre';
            }

            let msg = 'Sucursal: ' + sucursal + '\n';
            msg += 'Razón Social: ' + $('#txtName').val() + '\n';
            msg += 'RFC: ' + $('select[id=selectRFC2] option:selected').text() + '\n';
            msg += 'Teléfono: ' + $('#txtTelefono').val() + '\n';
            msg += 'Dirección: ' + $('#txtAddress').val() + '\n';
            msg += 'Email: ' + $('#txtEmail').val() + '\n';
            msg += 'Fecha de venta: ' + venta[0].date_close_date + '\n\n';

            msg += 'Productos:\n';
            msg += 'Cantidad | Artículo | P. Unitario | Total | Sin IVA\n';
            let length = productos.length;
            for (let i = 0; i < length; i++) {
                let num = parseInt(productos[i].num);
                let total = Number(productos[i].payed_sum) / 100;
                //msg += '1 | Producto de Prueba | 6 | 6 | 6\n';
                msg += num + ' | ' + productos[i].product_name + '[' + productos[i].modificator_name + ']' + ' | ' + (total / num) + ' | ' + total + ' | ' + (total / 1.16) + '\n';
            }

            msg += '\nPago Efectivo: ' + (Number(venta[0].payed_cash) / 100);
            msg += '\nPago Tarjeta: ' + (Number(venta[0].payed_card) / 100);
            msg += '\nTotal: ' + (Number(venta[0].payed_sum) / 100) + '\n\n';

            let tags = "";
            if (venta[0].transaction_comment !== null) {
                tags = venta[0].transaction_comment.split('&');
            }
            let tipo_pago = 'Una sola exhibición';

            msg += 'TAGS:\n';
            if (tags !== "") {
                tags.forEach((tag) => {
                    //msg += '* Tag de prueba\n\n';
                    if (tag.includes('Anticipo') || tag.includes('Crédito')) tipo_pago = 'Parcialidades';
                    msg += '* ' + tag + '\n\n';
                });
            }

            let forma_pago = 'Efectivo';
            if (Number(venta[0].payed_card) !== 0) forma_pago = 'Tarjeta';
            if (Number(venta[0].payed_cash) !== 0 && Number(venta[0].payed_card) !== 0) forma_pago = 'Combinado';
            if (venta[0].transaction_comment !== null) {
                if (venta[0].transaction_comment.includes('&PT')) forma_pago = "Transferencia";
            }

            msg += '\nCFDI: ' + $('select[id=selectCFDI] option:selected').val() + '-' + $('select[id=selectCFDI] option:selected').text() + '\n';
            msg += 'Forma de pago: ' + forma_pago + '\n';
            msg += 'Tipo de tarjeta: ' + $('select[id=selectTarjeta] option:selected').text() + '\n';
            msg += 'Método de Pago: ' + tipo_pago + '\n\n';
            msg += 'Observaciones:\n' + $('#facturaObservaciones').val();

            await new Promise(resolve => {
                Poster.makeRequest('url/send_email.php', {
                    headers: [],
                    method: 'POST',
                    data: {
                        ticket: $('#inputTicket').val().trim(),
                        msg: msg,
                        fecha_venta: fecha_venta,
                        post_venta: 1
                    },
                    timeout: 10000
                }, (answer) => {
                    console.log(answer);
                    //console.log('json answer: ', JSON.parse(answer.result));
                    if (answer && Number(answer.code) === 200) {
                        if (Number(answer.result) === 0) {
                            $('#btnFacturar').prop('disabled', false);
                            $('#inputTicket').val('');
                            showChangeNotification('success', '¡Éxito!', 'Solicitud de facturación enviada con éxito.');
                            resolve();
                        } else {
                            showChangeNotification('error', 'Oops...', 'Ha ocurrido un error. Por favor, intente de nuevo.');
                            resolve();
                        }
                    } else {
                        showChangeNotification('error', '¡Sin conexión!', 'No se ha recibido ninguna respuesta del servidor. Intente de nuevo.');
                        resolve();
                    }
                    $('#btnFacturar').prop('disabled', false);
                });
            });
        });
    });
}

/**
 * Genera la solicitud de factura y la manda a traves de nuestro servidor.
 * @deprecated
 */
function facturar_v3() {
    if ($('#inputTicket').val().trim() === '') {
        showChangeNotification('info', 'Aviso', 'Debe proporcionar un número de ticket.');
        return;
    }

    if ($('select[id=selectTarjeta] option:selected').val() === '0') {
        showChangeNotification('info', 'Aviso', 'Debe escoger una opción para el campo TARJETA.');
        return;
    }

    if ($('select[id=selectCFDI] option:selected').val() === '0') {
        showChangeNotification('info', 'Aviso', 'Debe escoger una opción para el campo CFDI.');
        return;
    }

    Swal.fire({
        title: 'Procesando...',
        allowOutsideClick: false,
        timer: 1000,
        onBeforeOpen: () => {
            Swal.showLoading();
            Swal.stopTimer();
        }
    });

    $('#btnFacturar').prop('disabled', true);

    let venta, productos;

    let query = '&transaction_id=' + $('#inputTicket').val().trim() +
        '&timezone=client&include_history=false&include_products=false';

    Poster.makeApiRequest('dash.getTransaction?' + query, {
        method: 'get'
    }, (transaction) => {
        console.log("transaction: ", transaction);
        venta = transaction;

        Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + $('#inputTicket').val().trim(), {
            method: 'get'
        }, async (productList) => {
            console.log("productos: ", productList);
            productos = productList;

            fecha_venta = "";

            if (venta[0].date_close_date !== null && venta[0].date_close_date !== undefined) {
                fecha_venta = venta[0].date_close_date.split(' ');
                fecha_venta = fecha_venta[0];
            } else {
                showNotification_v1('info', 'Aviso', 'El ticket ingresado no existe o la venta no ha sido cerrada aún.');
                $('#btnFacturar').prop('disabled', false);
                return;
            }

            let sucursal = '';
            switch (Number(venta[0].spot_id)) {
                case 1:
                    sucursal = 'Terranorte';
                    break;
                case 2:
                    sucursal = 'Caucel';
                    break;
                case 5:
                    sucursal = 'Matriz';
                    break;
                default:
                    sucursal = 'Sin nombre';
            }

            let msg = 'Sucursal: ' + sucursal + '\n';
            msg += 'Razón Social: ' + $('#txtName').val() + '\n';
            msg += 'RFC: ' + $('select[id=selectRFC2] option:selected').text() + '\n';
            msg += 'Teléfono: ' + $('#txtTelefono').val() + '\n';
            msg += 'Dirección: ' + $('#txtAddress').val() + '\n';
            msg += 'Email: ' + $('#txtEmail').val() + '\n';
            msg += 'Fecha de venta: ' + venta[0].date_close_date + '\n\n';

            msg += 'Productos:\n';
            msg += 'Cantidad | Artículo | P. Unitario | Total | Sin IVA\n';
            let length = productos.length;
            for (let i = 0; i < length; i++) {
                let num = parseInt(productos[i].num);
                let total = Number(productos[i].payed_sum) / 100;
                msg += num + ' | ' + productos[i].product_name + '[' + productos[i].modificator_name + ']' + ' | ' + (total / num) + ' | ' + total + ' | ' + (total / 1.16) + '\n';
            }

            msg += '\nPago Efectivo: ' + (Number(venta[0].payed_cash) / 100);
            msg += '\nPago Tarjeta: ' + (Number(venta[0].payed_card) / 100);
            msg += '\nTotal: ' + (Number(venta[0].payed_sum) / 100) + '\n\n';

            let tags = "";
            if (venta[0].transaction_comment !== null) {
                tags = venta[0].transaction_comment.split('&');
            }
            let tipo_pago = 'Una sola exhibición';

            msg += 'TAGS:\n';
            if (tags !== "") {
                tags.forEach((tag) => {
                    if (tag.includes('Anticipo') || tag.includes('Crédito')) tipo_pago = 'Parcialidades';
                    msg += '* ' + tag + '\n\n';
                });
            }

            let forma_pago = 'Efectivo';
            if (Number(venta[0].payed_card) !== 0) forma_pago = 'Tarjeta';
            if (Number(venta[0].payed_cash) !== 0 && Number(venta[0].payed_card) !== 0) forma_pago = 'Combinado';
            if (venta[0].transaction_comment !== null) {
                if (venta[0].transaction_comment.includes('&PT')) forma_pago = "Transferencia";
            }

            msg += '\nCFDI: ' + $('select[id=selectCFDI] option:selected').val() + '-' + $('select[id=selectCFDI] option:selected').text() + '\n';
            msg += 'Forma de pago: ' + forma_pago + '\n';
            msg += 'Tipo de tarjeta: ' + $('select[id=selectTarjeta] option:selected').text() + '\n';
            msg += 'Método de Pago: ' + tipo_pago + '\n\n';
            msg += 'Observaciones:\n' + $('#facturaObservaciones').val();

            enviarCorreo('Facturación Ticket #' + $('#inputTicket').val().trim() + ' [Post-venta]', msg);
        });
    });
}

/**
 * Genera la solicitud de factura y la manda a traves de nuestro servidor.
 */
async function facturar_v4() {
    if (ticketsArrayIsEmpty()) {
        showChangeNotification('info', 'Aviso', 'Debe proporcionar al menos un número de ticket.');
        return;
    }

    if ($('select[id=selectTarjeta] option:selected').val() === '0') {
        showChangeNotification('info', 'Aviso', 'Debe escoger una opción para el campo TARJETA.');
        return;
    }

    if ($('select[id=selectCFDI] option:selected').val() === '0') {
        showChangeNotification('info', 'Aviso', 'Debe escoger una opción para el campo CFDI.');
        return;
    }

    Swal.fire({
        title: 'Procesando...',
        allowOutsideClick: false,
        timer: 1000,
        onBeforeOpen: () => {
            Swal.showLoading();
            Swal.stopTimer();
        }
    });

    $('#btnFacturar').prop('disabled', true);

    let message = 'Razón Social: ' + $('#txtName').val() + '\n';
    message += 'RFC: ' + $('select[id=selectRFC2] option:selected').text() + '\n';
    message += 'Teléfono: ' + $('#txtTelefono').val() + '\n';
    message += 'Dirección: ' + $('#txtAddress').val() + '\n';
    message += 'Email: ' + $('#txtEmail').val() + '\n\n';

    let tickets = getTicketsArray();

    let fechas_ventas = "";
    let total_final = 0;

    for (let i = 0; i < tickets.length; i++) {
        let datos_ticket = await getDataTicket(tickets[i]);
        console.log('DATOS TICKET ' + tickets[i], datos_ticket);

        let venta = datos_ticket.venta[0];
        let productos = datos_ticket.productos;
        let date_close = "";

        if (venta && parseInt(venta.client_id) !== _client.id) {
            showNotification_v1('info', 'Aviso', 'El ticket ' + tickets[i] + ' no pertenece a este cliente.');
            Swal.close();
            $('#btnFacturar').prop('disabled', false);
            return;
        }

        if (venta !== undefined && venta.date_close_date !== null && venta.date_close_date !== undefined) {
            date_close = venta.date_close_date.split(' ');
            date_close = date_close[0];

            if (fechas_ventas === '') {
                fechas_ventas += date_close;
            } else {
                fechas_ventas += ',' + date_close;
            }
        } else {
            showNotification_v1('info', 'Aviso', 'El ticket ' + tickets[i] + ' no existe o la venta no ha sido cerrada aún.');
            Swal.close();
            $('#btnFacturar').prop('disabled', false);
            return;
        }

        let sucursal = '';
        switch (parseInt(venta.spot_id)) {
            case 1:
                sucursal = 'Terranorte';
                break;
            case 2:
                sucursal = 'Caucel';
                break;
            case 5:
                sucursal = 'Matriz';
                break;
            default:
                sucursal = 'Sin nombre';
        }

        message += "************************************************************\n"
        message += "Ticket: " + tickets[i] + " Sucursal: " + sucursal + " Fecha venta: " + date_close + "\n\n";
        message += 'Cantidad | Artículo | P. Unitario | Total | Sin IVA\n';

        let length = productos.length;
        for (let i = 0; i < length; i++) {
            let num = Number(productos[i].num);
            let total = Number(productos[i].payed_sum) / 100;
            let modificador = productos[i].modificator_name === null ? '' : productos[i].modificator_name;
            message += num + ' | ' + productos[i].product_name + '[' + modificador + ']' + ' | ' + (total / num) + ' | ' + total + ' | ' + (total / 1.16).toFixed(2) + '\n';
        }

        let total = parseFloat((Number(venta.payed_sum) / 100).toFixed(2));
        total_final += total;

        message += '\nPago Efectivo: ' + (Number(venta.payed_cash) / 100).toFixed(2);
        message += '\nPago Tarjeta: ' + (Number(venta.payed_card) / 100).toFixed(2);
        message += '\nTotal: ' + total + '\n\n';

        let tags = "";
        if (venta.transaction_comment !== null) {
            tags = venta.transaction_comment.split('&');
        }

        let tipo_pago = 'Una sola exhibición';

        message += 'TAGS:\n';
        if (tags !== "") {
            tags.forEach((tag) => {
                if (tag.includes('Anticipo') || tag.includes('Crédito')) tipo_pago = 'Parcialidades';
                message += '* ' + tag + '\n\n';
            });
        }

        let forma_pago = 'Efectivo';
        if (Number(venta.payed_card) !== 0) forma_pago = 'Tarjeta';
        if (Number(venta.payed_cash) !== 0 && Number(venta.payed_card) !== 0) forma_pago = 'Combinado';
        if (venta.transaction_comment !== null) {
            if (venta.transaction_comment.includes('&PT')) forma_pago = "Transferencia";
        }

        message += 'Forma de pago: ' + forma_pago + '\n';
        message += 'Método de Pago: ' + tipo_pago + '\n';
    }

    message += "************************************************************\n\n"

    message += 'Total final: $' + total_final + '\n';
    message += 'CFDI: ' + $('select[id=selectCFDI] option:selected').val() + '-' + $('select[id=selectCFDI] option:selected').text() + '\n';
    message += 'Tipo de tarjeta: ' + $('select[id=selectTarjeta] option:selected').text() + '\n';
    message += 'Observaciones:\n' + $('#facturaObservaciones').val();

    //console.log('MESSAGE', message);
    //console.log('TICKETS', tickets);
    //console.log('FECHAS', fechas_ventas);

    enviarCorreo_v2('Facturación Ticket ' + tickets.join(',') + ' [Post-venta]', message, fechas_ventas, tickets.join(','));

    //$('#btnFacturar').prop('disabled', false);
    //Swal.resumeTimer();
}

function getDataTicket(num_ticket) {
    return new Promise(resolve => {
        let datos = {};
        let query = '&transaction_id=' + num_ticket +
            '&timezone=client&include_history=false&include_products=false&status=2';

        Poster.makeApiRequest('dash.getTransaction?' + query, {
            method: 'get'
        }, (transaction) => {
            console.log("transaction: ", transaction);
            datos.venta = transaction;

            Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + num_ticket, {
                method: 'get'
            }, (productList) => {
                console.log("productos: ", productList);
                datos.productos = productList;

                resolve(datos);
            });
        });
    });
}

/**
 * Muestra un cuadro de dialogo del tipo y mensaje proporcionado.
 * @param {String} type El tipo de modal. Puede ser **success**, **error**, **question**, **warning** o **info**.
 * @param {String} title El texto que se mostrara en la barra de titulo del modal.
 * @param {String} text  El texto contenido en el cuerpo del modal.
 * @param {Boolean} needclose Indica si debe ser cerrada la ventana de Poster junto al modal. **False** por defecto.
 */
function showChangeNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        html: text,
        confirmButtonText: 'Ok',
        allowOutsideClick: false
    }).then((result) => {
        if (result.value) {
            if (type === 'success' || needclose === true) Poster.interface.closePopup();
        }
    });
}

/**
 * Obtiene todos los RFCs asociados al cliente.
 * @param {Number | String} clientId 
 */
function getClientRFC(clientId) {
    $.ajax({
        type: 'POST',
        data: { clientId: clientId },
        url: 'url/get_rfc_client.php',
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log('respuestas SERVER: ', data);

        $('#loader').hide();
        if (data.length !== 0) {
            $('#rfc-loaded').show();
            response = data;
            fillSelect();
            showInfoClient();
        } else {
            $('#rfc-no-loaded').show();
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        showChangeNotification('error', '¡Sin conexión!', 'No se ha recibido ninguna respuesta del servidor. Intente de nuevo.', true);
    });

    Poster.clients.get(clientId).then((client) => {
        if (!client) {
            return;
        }
        console.log('datos cliente:', client);
        _client = client;
        $('#txtTelefono').val(client.phone);
        $('#txtEmail').val(client.email);
    });
}

/**
 * Llena el selector con los RFCs obtenidos del cliente.
 */
function fillSelect() {
    let select = $('#selectRFC2').get(0);
    while (select.firstChild) select.removeChild(select.firstChild);
    for (let i = 0; i < response.length; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = response[i].client_rfc;
        select.appendChild(opt);
    }
}

/**
 * Muestra la informacion de facturacion del cliente segun el RFC seleccionado.
 */
function showInfoClient() {
    let index = $('select[id=selectRFC2]').val();
    //console.log($('select[id=selectRFC2] option:selected').text());
    //console.log('showInfoClient', response[index]);
    $('#txtName').val(response[index].client_name);
    $('#txtAddress').val(response[index].client_address);
}

/**
 * Da de alta un nuevo RFC del cliente.
 */
function darAltaRFC() {

    $('#btnAltaRFC').prop('disabled', true);

    let rfc = $("#altaRFC").val();

    if (rfc.length < 12 || rfc.length > 13) {
        showChangeNotification('error', '¡RFC inválido!', 'Verifiquelo por favor.');
        $('#btnAltaRFC').prop('disabled', false);
        return;
    }

    if ($('#altaName').val().trim() === '') {
        showChangeNotification('error', '¡Razón Social no proporcionada!', 'Verifiquelo por favor.');
        $('#btnAltaRFC').prop('disabled', false);
        return;
    }

    updateClientInfo();

    $.ajax({
        type: 'POST',
        data: {
            clientRFC: $('#altaRFC').val(),
            clientId: _client.id,
            clientName: $('#altaName').val(),
            clientAddress: $('#altaAddress').val()
        },
        url: 'url/alta_cliente.php',
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log('mod answer: ', data);
        switch (data) {
            case 0:
                $('#btnAltaRFC').prop('disabled', false);
                showChangeNotification('success', '¡Alta exitosa!', 'El RFC ha sido vinculado con éxito a este cliente.', true);
                break;
            case -1:
                showChangeNotification('error', '¡Un error ha ocurrido!', 'Por favor, intente de nuevo.');
                break;
            case -2:
                showChangeNotification('error', '¡RFC duplicado!', 'El RFC ingresado ya está vinculado a este cliente.')
                break;
            default:
                showChangeNotification('error', '¡Un error ha ocurrido!', 'Por favor, intente de nuevo.');
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        showChangeNotification('error', '¡Un error ha ocurrido!', 'Por favor, intente de nuevo.');
    }).always(function () {
        $('#btnAltaRFC').prop('disabled', false);
    });
}

//************************************************/
// Función para validar un RFC
// Devuelve el RFC sin espacios ni guiones si es correcto
// Devuelve false si es inválido
// (debe estar en mayúsculas, guiones y espacios intermedios opcionales)
function rfcValido(rfc, aceptarGenerico = true) {
    const re = /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/;
    var validado = rfc.match(re);

    if (!validado)  // Coincide con el formato general del regex?
        return false;

    // Separar el dígito verificador del resto del RFC
    const digitoVerificador = validado.pop(),
        rfcSinDigito = validado.slice(1).join(''),
        len = rfcSinDigito.length,

        // Obtener el digito esperado
        diccionario = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ",
        indice = len + 1;
    var suma,
        digitoEsperado;

    if (len == 12) suma = 0
    else suma = 481; // Ajuste para persona moral

    for (var i = 0; i < len; i++)
        suma += diccionario.indexOf(rfcSinDigito.charAt(i)) * (indice - i);
    digitoEsperado = 11 - suma % 11;
    if (digitoEsperado == 11) digitoEsperado = 0;
    else if (digitoEsperado == 10) digitoEsperado = "A";

    // El dígito verificador coincide con el esperado?
    // o es un RFC Genérico (ventas a público general)?
    if ((digitoVerificador != digitoEsperado)
        && (!aceptarGenerico || rfcSinDigito + digitoVerificador != "XAXX010101000"))
        return false;
    else if (!aceptarGenerico && rfcSinDigito + digitoVerificador == "XEXX010101000")
        return false;
    return rfcSinDigito + digitoVerificador;
}
//**************************************************/

/**
 * Valida que el RFC proporcionado cumple con el formato oficial.
 */
function validarRFC() {
    let input = $("#altaRFC").val();
    let rfc = input.trim().toUpperCase();
    $("#altaRFC").val(rfc);

    if (input.length < 12 || input.length > 13) {
        $("#divRFC").attr('class', 'has-error');
        $("#spanIcon").text('⛔');
        return;
    }

    let rfcCorrecto = rfcValido(rfc);

    if (rfcCorrecto) {
        $("#divRFC").attr('class', 'has-success');
        $("#spanIcon").text('✔️');
    } else {
        $("#divRFC").attr('class', 'has-warning');
        $("#spanIcon").text('⚠️');
    }
}

/**
 * Valida que se haya proporcionada una razon social.
 */
function validarRazonSocial() {
    let input = $("#altaName").val();
    let razonSocial = input.trim();
    $("#altaName").val(razonSocial);

    if (razonSocial === '') {
        $("#divRazon").attr('class', 'has-error');
        $("#spanIconName").text('⛔');
        return;
    } else {
        $("#divRazon").attr('class', 'has-success');
        $("#spanIconName").text('✔️');
    }
}

/**
 * Activa o desactiva el checbox de alta de telefono y email.
 */
function checkboxChange() {
    if ($('#checkbox').is(':checked')) {
        $('#altaTel').prop('readonly', false);
        $('#altaEmail').prop('readonly', false);
    } else {
        $('#altaTel').prop('readonly', true);
        $('#altaEmail').prop('readonly', true);
    }
}

/**
 * Actualiza el telefono y correo del cliente.
 */
function updateClientInfo() {
    if ($('#checkbox').is(':checked')) {
        if ($('#altaTel').val() !== '' || $('#altaEmail').val() !== '') {
            Poster.makeApiRequest('clients.updateClient', {
                method: 'post',
                data: {
                    client_id: _client.id,
                    phone: $('#altaTel').val(),
                    email: $('#altaEmail').val()
                },
            }, (result) => {
                console.log('result update client: ', result);
                if (result !== _client.id) {
                    showChangeNotification('info', 'Oops...', 'No se pudo actualizar la información del cliente en Poster');
                }
            });
        }
    }
}

/**
 * Muestra la ventana para nueva alta de RFC.
 */
function showViewAlta() {
    //$('#altaName').val(_client.lastname + " " + _client.firstname);
    $('#altaAddress').val(_client.address);
    $('#altaTel').val(_client.phone);
    $('#altaEmail').val(_client.email);

    $('#rfc-no-loaded').hide();
    $('#rfc-loaded').hide();
    $('#alta-rfc').show();
}

/**
 * Inicializa todos los sub-componentes.
 */
function init() {
    $('#loader').show();
    $('#rfc-loaded').hide();
    $('#alta-rfc').hide();
    $('#rfc-no-loaded').hide();

    $('#txtName').val('');
    $('#txtAddress').val('');

    $('select[id=selectTarjeta]').val('1');
    $('select[id=selectCFDI]').val('G03');

    // seccion del alta de rfc
    $('#spanIcon').text('@');
    $('#altaRFC').val('');
    $('#altaName').val('');
    $('#altaAddress').val('');
    $('#altaTel').val('');
    $('#altaEmail').val('');
    $('#altaTel').prop('readonly', true);
    $('#altaEmail').prop('readonly', true);
    $('#checkbox').prop("checked", false);
    $('#divRFC').removeClass('has-success has-warning has-error');

    $('#factura-archivos').val('');

    deleteAllTickets();
}

function resetInputs() {
    $('#inputTicket').val('');
    //$('#inputTickets').val('');
    $('#selectTarjeta').val('0');
    $('#selectCFDI').val('0');
    $('#factura-archivos').val('');
    $('#facturaObservaciones').val('');
    $('#btnFacturar').prop('disabled', false);
    deleteAllTickets();
}

function addTicketToArray() {
    let ticket = $('#inputTicket').val().trim();
    //let tickets_array = $('#inputTickets').val();

    if (ticket === '') return;
    if (ticketIsAdded(ticket)) return;

    //if (tickets_array.includes(ticket)) return;

    /*if (tickets_array === '') {
        $('#inputTickets').val(ticket);
    } else {
        $('#inputTickets').val(ticket + ',' + tickets_array);
    }*/

    createTicketTag(ticket);

    $('#inputTicket').val('');
}

function clearTicketsArray() {
    if ($('#inputTickets').val() !== '') {
        Swal.fire({
            type: 'question',
            title: '¿Está seguro?',
            text: '¿Borrar todos los tickets?',
            confirmButtonText: 'Sí',
            cancelButtonText: 'No',
            showCancelButton: true,
            allowOutsideClick: false
        }).then((result) => {
            if (result.value) {
                deleteAllTickets();
            }
        });
    }
}

function createTicketTag(num_ticket) {
    let div = $('#div-tag-tickets')[0];

    let anchor = document.createElement('a');
    anchor.className = "post-tag";
    anchor.innerText = num_ticket;
    anchor.id = "tag-" + num_ticket;
    anchor.onclick = function () { deleteTicket(num_ticket) };

    div.appendChild(anchor);
}

function deleteTicket(num_ticket) {
    $('#tag-' + num_ticket).remove();
}

function deleteAllTickets() {
    $("div[id='div-tag-tickets']").find('a[class="post-tag"]').each(function () {
        $(this).remove();
    });
}

function ticketIsAdded(num_ticket) {
    let result = false;
    $("div[id='div-tag-tickets']").find('a[class="post-tag"]').each(function () {
        if ($(this).text() === num_ticket) result = true;
    });
    return result;
}

function ticketsArrayIsEmpty() {
    return !$("#div-tag-tickets")[0].hasChildNodes();
}

function getTicketsArray() {
    let array = [];
    $("div[id='div-tag-tickets']").find('a[class="post-tag"]').each(function () {
        array.push($(this).text());
    });
    return array;
}

export default class FacturePlugin extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        data = this.props.data;
        clientId = this.props.clientId;
        if (clientId === 0 || clientId === undefined) return (<ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />);
        init();
        getClientRFC(clientId);
        return (
            <div className='facture-plugin'>
                <div>
                    <div className="loader-facture" id='loader' hidden={false}></div>

                    <div id='rfc-no-loaded' hidden={true}>
                        <h1>No hay información de facturación asociada a este cliente.</h1>
                        <br />
                        <button className='btn btn-default' onClick={showViewAlta}>Dar de alta</button>
                    </div>

                    <div id='alta-rfc' className='row' hidden={true}>
                        <div className='col-sm-5'>
                            <img src="url logo" alt="imagen" id='logo' className="img-circle img-responsive center-block" />
                        </div>
                        <div className='col-sm-6'>
                            <div className='alta-rfc form-group' id='divRFC'>
                                RFC:
                                <div className='input-group'>
                                    <span className="input-group-addon" id='spanIcon'>📄</span>
                                    <input type="text" className='form-control' defaultValue="" id="altaRFC" onBlur={validarRFC} placeholder="Obligatorio" />
                                </div>
                            </div>
                            <div className='alta-rfc fix-margin' id='divRazon'>
                                Razón social:
                                <div className='input-group'>
                                    <span className="input-group-addon" id='spanIconName'>👤</span>
                                    <input type="text" className='form-control' defaultValue="" id="altaName" onBlur={validarRazonSocial} placeholder="Obligatorio (Completo)" />
                                </div>
                            </div>
                            <div className='alta-rfc fix-margin'>
                                Dirección:
                                <input type="text" defaultValue="" id="altaAddress" placeholder="Opcional" />
                            </div>
                            <div className='alta-rfc fix-margin'>
                                Teléfono:
                                <input type="text" className='form-control' defaultValue="" id="altaTel" placeholder="Opcional" readOnly />
                            </div>
                            <div className='alta-rfc fix-margin'>
                                Email:
                                <input type="text" className='form-control' defaultValue="" id="altaEmail" placeholder="Opcional" readOnly />
                            </div>
                            <div className='alta-wrapper-btn'>
                                <button className="btn btn-green" id='btnAltaRFC' onClick={darAltaRFC} disabled={false}>¡Dar de alta RFC!</button>
                                <div className="checkbox">
                                    <label>
                                        <input type="checkbox" id='checkbox' onChange={checkboxChange} /> Actualizar Teléfono y Email.
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id='rfc-loaded' hidden={true}>
                        <div className="sub-wrapper-facture">
                            <input className="form-control" type="number" id="inputTicket" placeholder="Ingrese número de ticket"></input>
                            <button className="btn btn-info" id="btn-fact-agregar" onClick={addTicketToArray}>Agregar</button>
                            {/*Ticket(s):
                            <input className="form-control" type="text" id="inputTickets" readOnly placeholder="No ha agregado ningún ticket"></input>*/}
                            <button className="btn btn-danger" onClick={clearTicketsArray}>Vaciar</button>
                        </div>
                        <br />
                        <div id="div-tag-tickets" className="sub-wrapper-facture well well-sm"></div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            RFC:
                            <select className='form-control' id='selectRFC2' onChange={showInfoClient}></select>
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Razón social:
                            <input className='form-control' type='text' id='txtName' readOnly />
                            Teléfono:
                            <input className='form-control' type='text' id='txtTelefono' readOnly />
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Dirección:
                            <input className='form-control' type='text' id='txtAddress' readOnly />
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Email:
                            <input className='form-control' type='text' id='txtEmail' readOnly />
                        </div>
                        <br />
                        <div className="sub-wrapper-facture">
                            Tarjeta:
                            <select className="form-control" id="selectTarjeta">
                                <option value="0">Seleccione</option>
                                <option value="1">No aplica</option>
                                <option value="2">Débito</option>
                                <option value="3">Crédito</option>
                            </select>
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Uso de CFDI:
                            <select className='form-control' id='selectCFDI'>
                                <option value="0">Seleccione</option>
                                <option value='G03'>Gastos en general</option>
                                <option value='G01'>Adquisición de mercancias</option>
                                <option value='G02'>Devoluciones, descuentos o bonificaciones</option>
                                <option value='I01'>Construcciones</option>
                                <option value='I02'>Mobiliario y equipo de oficina</option>
                            </select>
                            Observaciones:
                            <textarea id="facturaObservaciones"></textarea>
                        </div>
                        <br />
                        <div className="sub-wrapper-facture">
                            Archivos:
                            <input type="file" className="form-control" multiple id="factura-archivos" />
                        </div>
                        <br />
                        <button className="btn btn-green" id="btnFacturar" onClick={facturar_v4}>Facturar</button>
                        {/*<button className="btn btn-default" onClick={testArchivos}>Test</button>*/}
                        <button className="btn btn-primary" id='btnNuevoRFC' onClick={showViewAlta}>Dar Alta Nuevo RFC</button>
                    </div>
                </div>
            </div>
        );
    }
}