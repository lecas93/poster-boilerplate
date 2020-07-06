import '../payment-interface/style.css'
import Swal from 'sweetalert2';
import swal from 'sweetalert';

import { getLonasDescription } from '../util/Util';

import { toFixedTrunc } from '../util/number_format';

import TicketPrinter from '../util/TicketPrinter';
import TicketManager from '../util/TicketManager';

import { rfcValido } from '../util/rfc_validator';

import { showNotification } from '../util/notifications';
import { showNotification_v1 } from '../util/notifications';

import { sendTrelloCardToServer } from '../util/Util';

import { sendNotification } from '../util/notifications';

import { checkModulesVersion } from '../util/notifications';

import { sendEmailNotification } from '../util/notifications';

import EditorDragula from '../cotizacion/EditorDragula';

let editorDragula = null;

const LIMIT_SIN_PAGO = 500.00;

let needclose = false;

let datosTarjeta, datosArchivos;

let printer = new TicketPrinter();
let ticketManager = new TicketManager();

let response;

const CREDIT_GROUP = parseInt(localStorage.getItem('credit_group_id'));
let isCreditClient = false;

let _client, client_name, asesor_name_ticket, asesor_id_ticket;
let asesor_name_venta, asesor_id_venta;
let fecha_venta;
let fecha_entrega;

let dataOrder;
let total, sub_total, cash, card, transfer, change, referencia;
let tipo_venta = '';
let currentInput = 'cash';

let sucursal;

let listaPedidos = [];
listaPedidos[1] = 'id list a';
listaPedidos[2] = 'id list b';
listaPedidos[5] = 'id list c';

let listaTerminados = [];
listaTerminados[1] = 'id list d';
listaTerminados[2] = 'id list e';
listaTerminados[5] = 'id list f';

let listaEntregados = [];
listaEntregados[1] = 'id list g';
listaEntregados[2] = 'id list h';
listaEntregados[5] = 'id list i';

let listaTrabajosExternos = [];
listaTrabajosExternos[1] = 'id list j';
listaTrabajosExternos[2] = 'id list k';
listaTrabajosExternos[5] = 'id list l';

let lona_desc = "";

let sucursal_notify = 0;
let comment_notify = "";

/**
 * Init principal
 */
function super_init() {
    needclose = false;
    init();
    checkEnableCredit();
    getClient(dataOrder.order.clientId);
    getAsesor();
    checkModulesVersion();
    calcularTiempoEntrega();
    checkNacional();
    generarTagVenta();
}

/**
 * Inicializa y establece todas las opciones a su estado por default.
 */
function init() {
    tipo_venta = "";

    client_name = "";
    asesor_name_ticket = "";
    asesor_name_venta = "";

    total = dataOrder.order.total;
    cash = 0;
    card = 0;
    transfer = 0;
    change = 0;
    referencia = "";

    comentarios = "";
    $('#pi-comentarios').val('');

    $('#pi-input-cash').val('');
    $('#pi-input-cash').focus();
    $('#pi-input-card, #pi-input-transfer, #pi-input-ref').val('');
    $('#p-pi-change').text('0');

    $('#switch-pi-prod').prop('checked', true);
    $('#switch-pi-ticket').prop('checked', true);

    $('#pi-fecha').val('');
    $('#pi-hora').val('0');
    $('#pi-sucursal-prod, #pi-sucursal-deliv').val('0');

    enableProdOptions($('#switch-pi-prod').prop('checked'));
    enableInputs();

    $('#div-pi-transfer').hide();
    $('#div-pi-alert').hide();

    $('#btn-pi-transfer').show();
    showButtons();

    $('#divCalculator').show();
    $('#divPaymentOptions').show();
    $('#div-pi-cerrar').hide();

    $('#div-late-prod').hide();
    $('#switch-pi-late-prod').prop('checked', false);

    getSucursal();
    init_v2();
}

/**
 * Establece la fecha y hora de entrega de una orden en el formato correcto para subirlo al Trello.
 * @param {String} fecha 
 * @param {String} hora 
 */
function establecerFechaEntrega(fecha, hora) {
    let _fecha = fecha.split('-');
    fecha_entrega = _fecha[2] + "/" + _fecha[1] + "/" + _fecha[0] + " " + hora;
}

function getFechaEntrega() {
    return fecha_entrega;
}

/**
 * Obtiene la información de la sucursal actual.
 */
function getSucursal() {
    Poster.makeApiRequest('access.getSpots', {
        method: 'get'
    }, (stations) => {
        let length = stations.length;
        for (let i = 0; i < length; i++) {
            if (Number(stations[i].spot_id) === Poster.settings.spotId) {
                sucursal = stations[i];
                console.log('SUCURSAL', sucursal);
                break;
            }
        }
    });
}

/**
 * Manda la solicitud de facturación de una orden.
 */
function facturar_v2() {
    return new Promise(resolve => {
        let venta, productos;

        let query = '&transaction_id=' + dataOrder.order.orderName +
            '&timezone=client&include_history=false&include_products=false';

        Poster.makeApiRequest('dash.getTransaction?' + query, {
            method: 'get'
        }, (transaction) => {
            console.log("transaction: ", transaction);
            venta = transaction;

            Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + dataOrder.order.orderName, {
                method: 'get'
            }, (productList) => {
                console.log("productos: ", productList);
                productos = productList;

                let fecha_venta = venta[0].date_close_date.split(' ');
                fecha_venta = fecha_venta[0];

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
                msg += 'Razón Social: ' + localStorage.getItem('clientName') + '\n';
                msg += 'RFC: ' + localStorage.getItem('clientRFC') + '\n';
                msg += 'Teléfono: ' + localStorage.getItem('clientPhone') + '\n';
                msg += 'Dirección: ' + localStorage.getItem('clientAddress') + '\n';
                msg += 'Email: ' + localStorage.getItem('clientEmail') + '\n';
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
                    tags = venta[0].transaction_comment.split('&')
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
                if (venta[0].transaction_comment.includes('&PT')) forma_pago = "Transferencia";

                msg += '\nCFDI: ' + localStorage.getItem('clientCFDI') + '\n';
                msg += 'Forma de pago: ' + forma_pago + '\n';
                msg += 'Tipo de tarjeta: ' + localStorage.getItem('clientTarjeta') + '\n';
                msg += 'Método de Pago: ' + tipo_pago + '\n\n';
                msg += 'Observaciones:\n' + localStorage.getItem('clientObservations');

                let num_ticket = dataOrder.order.orderName;

                let datos = {
                    subject: 'Facturación Ticket #' + num_ticket,
                    message: msg,
                    num_ticket: num_ticket,
                    fecha_venta: fecha_venta
                };

                $.ajax({
                    type: 'POST',
                    data: datos,
                    url: 'url/Pos/enviar_solicitud_facturacion',
                    dataType: 'json',
                    encoded: true
                }).done(function (data) {
                    if (parseInt(data.status) !== 0) {
                        Poster.interface.showNotification({
                            title: 'Error al solicitar factura',
                            message: 'Fallo al enviar solicitud de facturación.',
                            icon: 'https://joinposter.com/upload/apps/icons/posterboss-ios.png',
                        }).then((notification) => {
                            console.log('new notification', notification);
                        });
                        sendEmailNotification("FALLO AL ENVIAR SOLICITUD DE FACTURACION", Poster.settings.spotId, JSON.stringify(datos));
                    }
                    resolve();
                }).fail(function (xhr, textStatus, errorThrown) {
                    Poster.interface.showNotification({
                        title: 'Error al solicitar factura',
                        message: 'No se ha recibido ninguna respuesta del servidor. Intente de nuevo.',
                        icon: 'https://joinposter.com/upload/apps/icons/posterboss-ios.png',
                    }).then((notification) => {
                        console.log('new notification', notification);
                    });
                    sendEmailNotification("FALLO AL ENVIAR SOLICITUD DE FACTURACION", Poster.settings.spotId, JSON.stringify(datos));
                    resolve();
                });
            });
        });
    });
}

//#region FUNCIONES TRELLO

let crear_dos_tarjetas = false;

async function sendToTrello() {
    crear_dos_tarjetas = parseInt($('select[id=pi-sucursal-prod] option:selected').val()) !== Poster.settings.spotId;
    await getProductsToSend(dataOrder.order);
}

function sendToList(list, order, client, asesor, products, due) {
    return new Promise(resolve => {
        var noDirecto = $('#switch-pi-prod').prop('checked');

        datosTarjeta = {};
        datosArchivos = [];

        var creationSuccess = async function (data) {
            /*if (noDirecto) {
                sendNotification(sucursal_notify, comment_notify);
            }*/
            //console.log(JSON.parse(JSON.stringify(data, null, 2)));
            //console.log(JSON.stringify(data, null, 2));

            const myFiles = document.getElementById("pi-input-archivos").files;

            id_tarjeta_trello = data['id'];
            let result_tarjeta = JSON.parse(JSON.stringify(data, null, 2));
            datosTarjeta.url = result_tarjeta.shortUrl;

            if ($('#switch-pi-prod').prop('checked')) {
                if (myFiles.length != 0) {
                    let porcentaje = 100 / myFiles.length;

                    let html = `
                        <div class="progress">
                            <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="<val>" aria-valuemin="0" aria-valuemax="100" style="width: <val>%">
                                <val>% Completo
                            </div>
                        </div>
                        <div class="lds-dual-ring"></div>
                    `;

                    Swal.fire({
                        title: "Subiendo archivos...",
                        html: html.replace(/<val>/g, 0),
                        timer: 1000,
                        allowOutsideClick: false,
                        onBeforeOpen: () => {
                            Swal.stopTimer();
                            Swal.disableConfirmButton();
                        }
                    }).then((result) => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            console.log('proceso terminado');
                            Swal.fire({
                                title: 'Finalizando...',
                                timer: 500,
                                allowOutsideClick: false,
                                onBeforeOpen: () => {
                                    Swal.showLoading();
                                    Swal.stopTimer();
                                }
                            });
                            sendTrelloCardToServer(datosTarjeta, datosArchivos, () => {
                                if (!crear_dos_tarjetas) showNotification('success', 'Listo :)', '', true);
                                resolve();
                            });
                            if (!crear_dos_tarjetas) localStorage.setItem('lonas_' + dataOrder.order.orderName, '');
                        }
                    });

                    for (let i = 0; i < myFiles.length; i++) {
                        await createAndSendForm_v2(myFiles[i], data['id']);
                        Swal.update({ html: html.replace(/<val>/g, toFixedTrunc(porcentaje * (i + 1), 0)) });
                    }
                    Swal.resumeTimer();
                } else {
                    sendTrelloCardToServer(datosTarjeta, datosArchivos, () => { resolve(); });
                    if (!crear_dos_tarjetas) localStorage.setItem('lonas_' + dataOrder.order.orderName, '');
                    console.log('Card created successfully.');
                }
            } else {
                sendTrelloCardToServer(datosTarjeta, datosArchivos, () => { resolve(); });
                if (!crear_dos_tarjetas) localStorage.setItem('lonas_' + dataOrder.order.orderName, '');
                console.log('Card created successfully.');
            }
        };

        let produce = (noDirecto ? $('select[id=pi-sucursal-prod] option:selected').text() : sucursal.spot_name);
        let entrega = (noDirecto ? $('select[id=pi-sucursal-deliv] option:selected').text() : sucursal.spot_name);
        var orderDescription = "";
        orderDescription += "Cliente: " + client.name + "\n";
        orderDescription += "Telefono: " + client.phone + "\n";
        orderDescription += "Correo: " + client.email + "\n\n";
        orderDescription += "Sucursal de pedido: " + sucursal.spot_name + "\n";
        orderDescription += "Sucursal de produccion: " + produce + "\n";
        orderDescription += "Sucursal de entrega: " + entrega + "\n";
        orderDescription += "Asesor: " + asesor + "\n\n";
        if (solicitante_nacional !== '') {
            orderDescription += "Solicitante Nacional: " + solicitante_nacional + "\n\n";
        }
        orderDescription += "Comentarios: \n" + comentarios + "\n\n";
        orderDescription += products;

        let lonas_description = "";
        let lonas = localStorage.getItem('lonas_' + dataOrder.order.orderName);
        if (lonas !== '' && lonas !== null) {
            lonas = JSON.parse(lonas);
            if (lonas.length > 0) {
                orderDescription += "\n\n";
                orderDescription += "Detalles lonas:\n";
                lonas.forEach((lona) => {
                    lonas_description += "**" + lona[1] + "** | " + lona[2] + " **Base:** " + lona[3] + "cm **Altura:** " + lona[4] + "cm **Archivo:** " + lona[8] + "\n\n";
                });
                orderDescription += lonas_description;
            }
        }

        datosTarjeta.cliente = client.name;
        datosTarjeta.telefono = client.phone;
        datosTarjeta.email = client.email;
        datosTarjeta.solicita = sucursal.spot_name;
        datosTarjeta.produce = produce;
        datosTarjeta.entrega = entrega;
        datosTarjeta.asesor = asesor;
        datosTarjeta.comentario = "Venta Directa\n\n" + "Descripción tarjeta:\n" + orderDescription;
        datosTarjeta.productos = products;

        let time = noDirecto ? $('#pi-fecha').val() : getDateString();
        establecerFechaEntrega(time, due);
        let indice = noDirecto ? Number($('select[id=pi-sucursal-prod] option:selected').val()) : Poster.settings.spotId;

        let card_title = "";
        if ($('#switch-pi-prod').prop('checked')) {
            card_title = client.name + " - OT " + order.orderName + " / " + due + " " + time;
        } else {
            card_title = client.name + " - OT SP " + order.orderName + " / " + due + " " + time;
        }

        let newCard = {
            name: card_title,
            desc: orderDescription,
            idList: list[indice],
            pos: 'top',
            due: time + 'T' + due + ':00-' + obtenerModificadorHorario()
        };

        // establecemos datos a notificar en la sucursal de produccion
        sucursal_notify = indice;
        comment_notify = newCard.name;

        if (!noDirecto) newCard.dueComplete = true;

        //console.log("Tarjeta", newCard); // Borrar este log al terminar
        datosTarjeta.ticket = order.orderName;
        datosTarjeta.fecha_entrega = time;
        datosTarjeta.hora_entrega = due;

        window.Trello.post('/cards/', newCard, creationSuccess);
    });
}

function sendToTrabajosExternos(list, order, client, asesor, products, due) {
    return new Promise(resolve => {
        var noDirecto = $('#switch-pi-prod').prop('checked');

        datosTarjeta = {};
        datosArchivos = [];

        var creationSuccess = async function (data) {
            /*if (noDirecto) {
                sendNotification(sucursal_notify, comment_notify);
            }*/
            //console.log(JSON.parse(JSON.stringify(data, null, 2)));
            //console.log(JSON.stringify(data, null, 2));

            const myFiles = document.getElementById("pi-input-archivos").files;

            id_tarjeta_trello = data['id'];
            let result_tarjeta = JSON.parse(JSON.stringify(data, null, 2));
            datosTarjeta.url = result_tarjeta.shortUrl;

            if ($('#switch-pi-prod').prop('checked')) {
                if (myFiles.length != 0) {
                    let porcentaje = 100 / myFiles.length;

                    let html = `
                        <div class="progress">
                            <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="<val>" aria-valuemin="0" aria-valuemax="100" style="width: <val>%">
                                <val>% Completo
                            </div>
                        </div>
                        <div class="lds-dual-ring"></div>
                    `;

                    Swal.fire({
                        title: "Subiendo archivos...",
                        html: html.replace(/<val>/g, 0),
                        timer: 1000,
                        allowOutsideClick: false,
                        onBeforeOpen: () => {
                            Swal.stopTimer();
                            Swal.disableConfirmButton();
                        }
                    }).then((result) => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            console.log('proceso terminado');
                            Swal.fire({
                                title: 'Finalizando...',
                                timer: 500,
                                allowOutsideClick: false,
                                onBeforeOpen: () => {
                                    Swal.showLoading();
                                    Swal.stopTimer();
                                }
                            });
                            showNotification('success', 'Listo :)', '', true);
                            localStorage.setItem('lonas_' + dataOrder.order.orderName, '');
                            resolve();
                        }
                    });

                    for (let i = 0; i < myFiles.length; i++) {
                        await createAndSendForm_v2(myFiles[i], data['id']);
                        Swal.update({ html: html.replace(/<val>/g, toFixedTrunc(porcentaje * (i + 1), 0)) });
                    }
                    Swal.resumeTimer();
                } else {
                    localStorage.setItem('lonas_' + dataOrder.order.orderName, '');
                    console.log('Card created successfully.');
                    resolve();
                }
            } else {
                localStorage.setItem('lonas_' + dataOrder.order.orderName, '');
                console.log('Card created successfully.');
                resolve();
            }
        };

        let produce = (noDirecto ? $('select[id=pi-sucursal-prod] option:selected').text() : sucursal.spot_name);
        let entrega = (noDirecto ? $('select[id=pi-sucursal-deliv] option:selected').text() : sucursal.spot_name);
        var orderDescription = "";
        orderDescription += "Cliente: " + client.name + "\n";
        orderDescription += "Telefono: " + client.phone + "\n";
        orderDescription += "Correo: " + client.email + "\n\n";
        orderDescription += "Sucursal de pedido: " + sucursal.spot_name + "\n";
        orderDescription += "Sucursal de produccion: " + produce + "\n";
        orderDescription += "Sucursal de entrega: " + entrega + "\n";
        orderDescription += "Asesor: " + asesor + "\n\n";
        if (solicitante_nacional !== '') {
            orderDescription += "Solicitante Nacional: " + solicitante_nacional + "\n\n";
        }
        orderDescription += "Comentarios: \n" + comentarios + "\n\n";
        orderDescription += products;

        let lonas_description = "";
        let lonas = localStorage.getItem('lonas_' + dataOrder.order.orderName);
        if (lonas !== '' && lonas !== null) {
            lonas = JSON.parse(lonas);
            if (lonas.length > 0) {
                orderDescription += "\n\n";
                orderDescription += "Detalles lonas:\n";
                lonas.forEach((lona) => {
                    lonas_description += "**" + lona[1] + "** | " + lona[2] + " **Base:** " + lona[3] + "cm **Altura:** " + lona[4] + "cm **Archivo:** " + lona[8] + "\n\n";
                });
                orderDescription += lonas_description;
            }
        }

        datosTarjeta.cliente = client.name;
        datosTarjeta.telefono = client.phone;
        datosTarjeta.email = client.email;
        datosTarjeta.solicita = sucursal.spot_name;
        datosTarjeta.produce = produce;
        datosTarjeta.entrega = entrega;
        datosTarjeta.asesor = asesor;
        datosTarjeta.comentario = "Venta Directa\n\n" + "Descripción tarjeta:\n" + orderDescription;
        datosTarjeta.productos = products;

        let time = noDirecto ? $('#pi-fecha').val() : getDateString();
        establecerFechaEntrega(time, due);
        let indice = Poster.settings.spotId;

        let card_title = "";
        if ($('#switch-pi-prod').prop('checked')) {
            card_title = client.name + " - OT " + order.orderName + " / " + due + " " + time;
        } else {
            card_title = client.name + " - OT SP " + order.orderName + " / " + due + " " + time;
        }

        var newCard = {
            name: card_title,
            desc: orderDescription,
            idList: list[indice],
            pos: 'top',
            due: time + 'T' + due + ':00-' + obtenerModificadorHorario()
        };

        // establecemos datos a notificar en la sucursal de produccion
        sucursal_notify = indice;
        comment_notify = newCard.name;

        if (!noDirecto) newCard.dueComplete = true;

        //console.log("Tarjeta", newCard); // Borrar este log al terminar
        datosTarjeta.ticket = order.orderName;
        datosTarjeta.fecha_entrega = time;
        datosTarjeta.hora_entrega = due;

        window.Trello.post('/cards/', newCard, creationSuccess);
    });
}

function obtenerModificadorHorario() {
    let date = new Date();
    let dateUTC = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toUTCString();
    dateUTC = dateUTC.split(' ');
    console.log(dateUTC);
    console.log(dateUTC[4]);
    return dateUTC[4].replace(':00', '');
}

function getProductsToSend(order) {
    return new Promise(resolve => {
        let asesor;
        let cliente = {};

        Poster.users.getActiveUser().then((user) => {
            if (!user) {
                asesor = 'nadie';
            }
            asesor = user.name;
        });

        Poster.clients.get(order.clientId).then((client) => {
            if (!client) {
                cliente.name = 'Nadie';
                cliente.phone = '0000000000';
                cliente.email = 'nombre@dominio.com'
                return;
            }

            cliente.name = client.firstname + ' ' + client.lastname;
            cliente.phone = client.phone;
            cliente.email = client.email;
        });

        Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + order.orderName, {
            method: 'get'
        }, async (productList) => {
            let checked = $('#switch-pi-prod').prop('checked');

            var products = "Productos: \n";
            console.log("productos: ", productList);
            let length = productList.length;
            let modification;
            let due = (checked ? $('select[id=pi-hora] option:selected').text() : getTimeString());

            for (let i = 0; i < length; i++) {
                if (productList[i].modificator_name != null) {
                    modification = " " + productList[i].modificator_name;
                } else {
                    modification = '';
                }
                products += "**" + parseInt(productList[i].num) + "** | " + productList[i].product_name + modification + "\n";
            }

            if (checked) {
                await sendToList(listaPedidos, order, cliente, asesor, products, due);
                if (crear_dos_tarjetas) {
                    await sendToTrabajosExternos(listaTrabajosExternos, order, cliente, asesor, products, due);
                }
            } else {
                await sendToList(listaEntregados, order, cliente, asesor, products, due);
            }
            resolve();
        });
    });
}

function getDateString(type = 0, now = new Date()) {
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }
    if (type == 0) {
        return year + "-" + month + "-" + day;
    } else {
        return year + "" + month + "" + day;
    }

}

function getTimeString(now = new Date()) {
    let hora = now.getHours();
    let minutos = now.getMinutes();
    if (hora < 10) hora = "0" + hora;
    if (minutos < 10) minutos = "0" + minutos;

    return hora + ":" + minutos;
}

//#endregion

//#region FUNCIONES BASE

/**
 * Verifica si se debe o no imprimir el ticket de venta.
 */
function isPrintTicketActive() {
    return $('#switch-pi-ticket').prop('checked');
}

/**
 * Habilita los inputs.
 */
function enableInputs() {
    $('#pi-input-cash, #pi-input-card, #pi-input-transfer, #pi-input-ref').prop('disabled', false);
}

/**
 * Deshabilita los inputs.
 */
function disableInputs() {
    $('#pi-input-cash, #pi-input-card, #pi-input-transfer, #pi-input-ref').prop('disabled', true);
}

/**
 * Cierra una venta como sin pago.
 */
function cerrarSinPago() {
    $('#btn-pi-cerrar').prop('disabled', true);

    let reason = $('input[name="optionsRadios"]:checked').val();

    Poster.makeApiRequest('transactions.closeTransaction', {
        method: 'post',
        data: {
            spot_id: Poster.settings.spotId,
            spot_tablet_id: Poster.settings.spotTabletId,
            transaction_id: dataOrder.order.orderName,
            payed_cash: 0,
            payed_card: 0,
            payed_cert: 0,
            reason: reason
        },
    }, (result) => {
        console.log('result: ', result);
        if (result) {
            if (result.err_code === 0) {
                Poster.interface.closePopup();
            } else {
                showNotification_v1('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
            }
        }
        $('#btn-pi-cerrar').prop('disabled', false);
    });
}

/**
 * Verifica si el cliente pertenece al grupo de Crédito.
 */
function checkEnableCredit() {
    Poster.clients.get(dataOrder.order.clientId).then((client) => {
        if (!client) {
            isCreditClient = false;
            return;
        }

        if (client.groupId !== CREDIT_GROUP) {
            isCreditClient = false;
        } else {
            isCreditClient = true;
        }
    });
}

function hideButtons() {
    $('#btn-pi-anticipo, #btn-pi-credito, #btn-pi-sinpago, #btn-pi-casainvita').hide();
}

function showButtons() {
    $('#btn-pi-anticipo, #btn-pi-credito, #btn-pi-sinpago, #btn-pi-casainvita').show();
}

/**
 * Despliega en pantalla las opciones especiales de venta.
 * @param {String} id Puede ser **transfer**, **anticipo** o **credito**.
 */
function setTipoPago(id) {
    asked_for_credit = false; // reseteamos la variable para cualquier cambio en el tipo de pago
    switch (id) {
        case 'transfer':
            let inner_cash = $('#pi-input-cash').val();
            $('#pi-input-transfer').val(inner_cash);
            $('#pi-input-cash').val('');

            $('#div-pi-transfer').show();
            $('#btn-pi-transfer').hide();
            break;
        case 'anticipo':
            if (isPublicClient()) {
                showNotification_v1('info', 'Aviso', 'No se pueden hacer ANTICIPOS a Público en General.');
                return;
            }
            tipo_venta = 'ANTICIPO';
            alertTipoPago(tipo_venta);
            hideButtons();
            break;
        case 'credito':
            if (isPublicClient()) {
                showNotification_v1('info', 'Aviso', 'No se pueden hacer CRÉDITOS a Público en General.');
                return;
            }
            if (!isCreditClient) {
                showNotification_v1('info', 'Aviso', 'El cliente no pertenece al grupo de CRÉDITOS.');
                return;
            }
            numpad_blocked = true;
            $('#pi-input-cash').val('');
            $('#pi-input-card').val('');
            $('#pi-input-transfer').val('');
            $('#p-pi-change').text(toFixedTrunc(0, 2));
            vuelto = 0;
            tipo_venta = 'CRÉDITO';
            alertTipoPago(tipo_venta);
            hideButtons();
            disableInputs();
            break;
        case 'sinpago':
            console.log('AUTH:', localStorage.getItem('auth'));
            if (localStorage.getItem('auth') === '0') {
                if (dataOrder.order.total <= LIMIT_SIN_PAGO) {
                    // procede
                    numpad_blocked = true;
                    $('#pi-input-cash').val('');
                    $('#pi-input-card').val('');
                    $('#pi-input-transfer').val('');
                    $('#p-pi-change').text(toFixedTrunc(0, 2));
                    vuelto = 0;
                    tipo_venta = 'SIN PAGO';
                    alertTipoPago(tipo_venta);
                    hideButtons();
                    disableInputs();
                } else {
                    showNotification_v1('info', 'Información', 'Solo ventas menores o iguales a $500 pueden ser registradas como anticipo sin pago.');
                }
            } else {
                // no procede
                showNotification_v1('info', '¡Acción no permitida!', 'Solo los ENCARGADOS DE SUCURSAL pueden realizar anticipos sin pago.');
            }
            break;
        case 'casainvita':
            numpad_blocked = true;
            $('#pi-input-cash').val('');
            $('#pi-input-card').val('');
            $('#pi-input-transfer').val('');
            $('#p-pi-change').text(toFixedTrunc(0, 2));
            vuelto = 0;
            tipo_venta = 'CASAINVITA';
            alertTipoPago("TRABAJO INTERNO");
            hideButtons();
            disableInputs();
            break;
    }
}

/**
 * Verifica si la cuenta del cliente vinculado a la orden abierta es la de Público en General.
 * Regresa **true** si lo es.
 */
function isPublicClient() {
    if (dataOrder.order.clientId === 5) {
        return true;
    } else {
        return false;
    }
}

/**
 * Modifica el texto del alert segun el tipo de pago.
 * @param {String} tipo El tipo de pago. 
 */
function alertTipoPago(tipo) {
    $('#p-pi-alert').text('El pago será procesado como ' + tipo);
    $('#div-pi-alert').show();
}

/**
 * Devuelve el alert a su estado por defecto.
 */
function resetTipoPago() {
    numpad_blocked = false;
    tipo_venta = "";
    $('#div-pi-alert').hide();
    //$('#btn-pi-anticipo, #btn-pi-credito, #btn-pi-sinpago').show();
    showButtons();
    enableInputs();
}

/**
 * Habilita o deshabilita las opciones para mandar a producción.
 */
function setProduccion() {
    if ($('#switch-pi-prod').prop('checked')) {
        enableProdOptions(true);
        $('#div-input-archivos').show();
        $('#div-late-prod').css('display', 'none');
        $('#switch-pi-late-prod').prop('checked', false);
    } else {
        enableProdOptions(false);
        $('#div-input-archivos').hide();
        $('#div-late-prod').css('display', 'inline-flex');
        $('#pi-fecha').val('');
        $("#pi-hora, #pi-sucursal-prod, #pi-sucursal-deliv").val('0');
    }
}

function setLateProduction() {
    if ($('#switch-pi-late-prod').prop('checked')) {
        enableProdOptions(true);
        $("#pi-sucursal-prod, #pi-sucursal-deliv").prop('disabled', true);
        $("#pi-sucursal-prod, #pi-sucursal-deliv").val(Poster.settings.spotId);
        $("#pi-sucursal-prod, #pi-sucursal-deliv").css("background-color", "#ccc");
    } else {
        enableProdOptions(false);
        $("#pi-sucursal-prod, #pi-sucursal-deliv").prop('disabled', false);
        $('#pi-fecha').val('');
        $("#pi-hora, #pi-sucursal-prod, #pi-sucursal-deliv").val('0');
        $("#pi-sucursal-prod, #pi-sucursal-deliv").css("background-color", "#ccc");
    }
}

/**
 * Establece el estilo visual de las opciones de producción.
 * @param {Boolean} v 
 */
function enableProdOptions(v) {
    $("#pi-fecha, #pi-hora, #pi-sucursal-prod, #pi-sucursal-deliv").prop('disabled', !v);

    if (!v) {
        $("#pi-fecha, #pi-hora, #pi-sucursal-prod, #pi-sucursal-deliv").css("background-color", "#ccc");
    } else {
        $("#pi-fecha, #pi-hora, #pi-sucursal-prod, #pi-sucursal-deliv").css("background-color", "white");
    }
}

/**
 * Intercambia la vistas entre la ventana de pago o el cierre de venta sin pago.
 */
function toggleView() {
    $('#divPaymentOptions').toggle();
    $('#div-pi-cerrar').toggle();
    $('#divCalculator').toggle('fast');
}

/**
 * Establece el input con el que se estará trabajando.
 * @param {String} input 
 */
function setCurrentInput(input) {
    currentInput = input;
}

/**
 * Agrega un valor o modifica el contenido de un input.
 * @param {Number | String} n El valor a agregar.
 */
function addInput(n) {
    if (numpad_blocked) return;

    $('#pi-input-' + currentInput).focus();

    if (n === '.') {
        return;
        //if ($('#pi-input-' + currentInput).val().includes('.')) return;
    }

    if (n === 'backspace') {
        let i = $('#pi-input-' + currentInput).val();
        i = i.slice(0, -1);
        $('#pi-input-' + currentInput).val(i);
        actualizarVuelto();
        return;
    }

    if (n === 100 || n === 200 || n === 500) {
        let ci = Number($('#pi-input-' + currentInput).val());
        if (ci % 100 !== 0) {
            $('#pi-input-' + currentInput).val(n);
            actualizarVuelto();
        } else {
            $('#pi-input-' + currentInput).val(ci + n);
            actualizarVuelto();
        }
        return;
    }

    let new_value = $('#pi-input-' + currentInput).val() + n;
    $('#pi-input-' + currentInput).val(new_value);
    actualizarVuelto();
}

/**
 * Obtiene la información del cliente.
 * @param {Number} id El ID Poster del cliente.
 */
function getClient(id) {
    Poster.clients.get(id).then((client) => {
        if (!client) {
            return;
        }
        _client = client;
        client_name = client.lastname + ' ' + client.firstname + ' ' + client.patronymic;
    });
}

/**
 * Obtiene la información del asesor activo.
 */
function getAsesor() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            asesor_name_venta = "***"
            asesor_id_venta = 7;
            return;
        }

        asesor_name_venta = user.name;
        asesor_id_venta = user.id;
    });

    Poster.users.get(dataOrder.order.userId).then((user) => {
        if (!user) {
            asesor_name_ticket = "***";
            asesor_id_ticket = 7;
            return;
        }

        asesor_name_ticket = user.name;
        asesor_id_ticket = user.id;
    });
}

/**
 * Calcula el cambio de acuerdo a los valores proporcionados y lo despliega en pantalla.
 */
function actualizarVuelto() {
    obtenerDatosEntrada();
    vuelto = subTotal - dataOrder.order.total;
    vuelto = parseFloat(vuelto.toFixed(2));
    $('#p-pi-change').text(toFixedTrunc(vuelto, 2));
}

//#endregion

//#region FUNCIONES FACTURACION

let html_sin_datos = `
    <div>
        <h1>No hay información de facturación asociada a este cliente.</h1>
        <br />
        <button class='btn btn-default' id="btn-pi-altaRFC" style="font-size: 18px;">Dar de alta</button>
    </div>
`;

let html_facturar = `
    <div class="row">
        <div class="col-sm-12">
            <div class="div-pi-switch">
                <p class="p-pi-switch">Facturar</p>
                <label class="switch">
                    <input type="checkbox" id="switch-pi-facturar" />
                    <span class="slider round"></span>
                </label>
            </div>
            <br />
            <div class='sub-wrapper-facture'>
                RFC:
                <select class='form-control' id='selectRFC'></select>
            </div>
            <br />
            <div class='sub-wrapper-facture'>
                Razón social:
                <input class='form-control' type='text' id='txtName' readonly />
                Teléfono:
                <input class='form-control' type='text' id='txtTelefono' readonly />
            </div>
            <br />
            <div class='sub-wrapper-facture'>
                Dirección:
                <input class='form-control' type='text' id='txtAddress' readonly />
            </div>
            <br />
            <div class='sub-wrapper-facture'>
                Email:
                <input class='form-control' type='text' id='txtEmail' readonly />
            </div>
            <br />
            <div class="sub-wrapper-facture">
                Tarjeta:
                <select class="form-control" id="selectTarjeta">
                    <option value="0">Seleccione</option>
                    <option value="1">No aplica</option>
                    <option value="2">Débito</option>
                    <option value="3">Crédito</option>
                </select>
            </div>
            <br />
            <div class='sub-wrapper-facture'>
                Uso de CFDI:
                <select class='form-control' id='selectCFDI'>
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
            <div class="row">
                <div class="col-sm-6">
                    <button class="btn btn-green" id="btn-facturar" >Aplicar</button>
                </div>
                <div class="col-sm-4">
                    <button class="btn btn-primary" id='btnNuevoRFC' >Dar Alta Nuevo RFC</button>
                </div>
            </div>
        </div>
    </div>
`;

let html_alta_rfc = `
    <div class="row" id="inner_alta_rfc">
        <div class="col-sm-6">
            <div class='alta-rfc form-group' id="divRFC">
                RFC:
                <div class='input-group'>
                    <span class="input-group-addon" id='spanIcon'>📄</span>
                    <input type="text" class='form-control' id="altaRFC" placeholder="Obligatorio" />
                </div>
            </div>
            <div class='alta-rfc fix-margin' id='divRazon'>
                Razón social:
                <div class='input-group'>
                    <span class="input-group-addon" id='spanIconName'>👤</span>
                    <input type="text" class='form-control' id="altaName" placeholder="Obligatorio (Completo)" />
                </div>
            </div>
            <div class='alta-rfc fix-margin'>
                Dirección:
                <input type="text" id="altaAddress" placeholder="Opcional" />
            </div>
            <div class='alta-rfc fix-margin'>
                Teléfono:
                <input type="text" class='form-control' value="value_phone" id="altaTel" placeholder="Opcional" readonly />
            </div>
            <div class='alta-rfc fix-margin'>
                Email:
                <input type="text" class='form-control' value="value_email" id="altaEmail" placeholder="Opcional" readonly />
            </div>
            <div class='alta-wrapper-btn'>
                <button class="btn btn-green" id='btnAltaRFC'>¡Dar de alta RFC!</button>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" id='checkbox' /> Actualizar Teléfono y Email.
                    </label>
                </div>
            </div>
        </div>
        <div class="col-sm-4">
            <img src="url logo" style="position: absolute; margin-left: 40%; height: 300px; width: auto;" alt="imagen" id='logo' class="img-circle img-responsive center-block" />
        </div>
    </div>
`;

/**
 * Despliega en pantalla el modal para mandar a facturar una orden.
 */
function showViewFacturar() {
    Swal.fire({
        title: '',
        grow: 'fullscreen',
        html: '<h3>Espere un momento...</h3>',
        onOpen: () => {
            Swal.showLoading();
            checkClientRFC(dataOrder.order.clientId);
        },
        confirmButtonText: 'Cerrar'
    });
}

/**
 * Muestra la ventana de alta de RFC.
 */
$(document).on('click', '#btn-pi-altaRFC', () => {
    html_alta_rfc = html_alta_rfc.replace('value_phone', _client.phone);
    html_alta_rfc = html_alta_rfc.replace('value_email', _client.email);
    Swal.update({ html: html_alta_rfc });
});

/**
 * Activa o desactiva los campos de telefono y email.
 */
$(document).on('change', '#checkbox', () => {
    if ($('#checkbox').is(':checked')) {
        $('#altaTel, #altaEmail').prop('readonly', false);
    } else {
        $('#altaTel, #altaEmail').prop('readonly', true);
    }
});

/**
 * Valida que el RFC sea correcto.
 */
$(document).on('keyup', '#altaRFC', () => {
    validarRFC();
});

/**
 * Valida que el RFC sea correcto.
 */
$(document).on('focusout', '#altaRFC', () => {
    validarRFC();
});

/**
 * Valida que el RFC sea correcto.
 */
function validarRFC() {
    $("#divRFC").removeClass('has-error has-success has-warning');

    let input = $("#altaRFC").val();
    let rfc = input.trim().toUpperCase();
    $("#altaRFC").val(rfc);

    if (input.length < 12 || input.length > 13) {
        $("#divRFC").addClass('has-error');
        $("#spanIcon").text('⛔');
        return;
    }

    let rfcCorrecto = rfcValido(rfc);

    if (rfcCorrecto) {
        $("#divRFC").addClass('has-success');
        $("#spanIcon").text('✔️');
    } else {
        $("#divRFC").addClass('has-warning');
        $("#spanIcon").text('⚠️');
    }
}

/**
 * Valida que la razon social haya sido proporcionada.
 */
$(document).on('focusout', '#altaName', () => {
    $("#divRazon").removeClass('has-error has-success');

    let input = $("#altaName").val();
    let razonSocial = input.trim();
    $("#altaName").val(razonSocial);

    if (razonSocial === '') {
        $("#divRazon").addClass('has-error');
        $("#spanIconName").text('⛔');
        return;
    } else {
        $("#divRazon").addClass('has-success');
        $("#spanIconName").text('✔️');
    }
});

/**
 * Inicia el proceso para la alta de RFC en el sistema.
 */
$(document).on('click', '#btnAltaRFC', () => {

    $('#btnAltaRFC').prop('disabled', true);

    let rfc = $("#altaRFC").val().trim();

    if (rfc.length < 12 || rfc.length > 13) {
        showNotification_v1('error', '¡RFC inválido!', 'Verifiquelo por favor.')
        $('#btnAltaRFC').prop('disabled', false);
        return;
    }

    if ($('#altaName').val().trim() === '') {
        swal("¡Razón Social no proporcionada!", "Verifiquelo por favor.", "error");
        $('#btnAltaRFC').prop('disabled', false);
        return;
    }

    updateClientInfo();

    let datos = {
        clientRFC: $('#altaRFC').val(),
        clientId: _client.id,
        clientName: $('#altaName').val(),
        clientAddress: $('#altaAddress').val()
    };

    $.ajax({
        type: 'POST',
        data: datos,
        url: 'url/alta_cliente.php',
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log('mod answer: ', data);
        switch (data) {
            case 0:
                showNotification('success', '¡Alta exitosa!', 'El RFC ha sido vinculado con éxito a este cliente.');
                break;
            case -1:
                swal("¡Un error ha ocurrido!", "Por favor, intente de nuevo.", "error");
                break;
            case -2:
                swal("¡RFC duplicado!", "El RFC ingresado ya está vinculado a este cliente.", "error");
                break;
            default:
                swal("¡Un error ha ocurrido!", "Por favor, intente de nuevo.", "error");
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        swal("¡Un error ha ocurrido!", "Por favor, intente de nuevo.", "error");
    }).always(function () {
        $('#btnAltaRFC').prop('disabled', false);
    });
});

/**
 * Actualiza el telefono y email del cliente en Poster.
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
                    showNotification_v1('info', 'Oops...', 'No se pudo actualizar la información del cliente en Poster');
                }
            });
        }
    }
}

/**
 * Obtiene la lista de RFCs vinculados al cliente.
 * @param {Number} clientId El ID Poster del cliente.
 */
function checkClientRFC(clientId) {

    Poster.clients.get(clientId).then((client) => {
        if (!client) {
            return;
        }
        console.log('datos cliente:', client);
        _client = client;

        $.ajax({
            type: 'POST',
            data: { clientId: clientId },
            url: 'url/get_rfc_client.php',
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            console.log('RFCS CLIENTE', data);
            if (data.length !== 0) {
                response = data;
                Swal.update({ html: html_facturar });
                showDatosFacturacion();
            } else {
                Swal.update({ html: html_sin_datos });
            }
        }).fail(function (xhr, textStatus, errorThrown) {
            showNotification_v1('error', '¡Sin conexión!', 'No se ha recibido ninguna respuesta del servidor. Intente de nuevo.');
        }).always(function () {
            Swal.hideLoading();
        });
    });

}

/**
 * Despliega en pantalla los datos de facturacion segun el RFC seleccionado.
 */
function showDatosFacturacion() {
    fillSelect();
    showInfoClient();
}

/**
 * Llena el select con los RFCs vinculados al cliente.
 */
function fillSelect() {
    let select = $('#selectRFC').get(0);
    while (select.firstChild) select.removeChild(select.firstChild);
    for (let i = 0; i < response.length; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = response[i].client_rfc;
        select.appendChild(opt);
    }
}

/**
 * Muestra los datos de facturacion del cliente en pantalla.
 */
function showInfoClient() {
    let index = $('select[id=selectRFC]').val();
    $('#txtName').val(response[index].client_name);
    $('#txtAddress').val(response[index].client_address);
    $('#txtTelefono').val(_client.phone);
    $('#txtEmail').val(_client.email);
}

/**
 * Despliega los datos de facturacion segun el RFC seleccionado.
 */
$(document).on('change', '#selectRFC', () => {
    showInfoClient();
});

/**
 * Guarda la configuracion de la facturacion.
 */
$(document).on('click', '#btn-facturar', () => {
    aplicarCambios();
});

/**
 * Guarda la configuracion de la facturacion.
 */
async function aplicarCambios() {
    if ($('select[id=selectTarjeta] option:selected').val() === '0') {
        showNotification_v1('info', 'Aviso', 'Debe escoger una opción para el campo TARJETA.');
        return;
    }

    if ($('select[id=selectCFDI] option:selected').val() === '0') {
        showNotification_v1('info', 'Aviso', 'Debe escoger una opción para el campo CFDI.');
        return;
    }

    let active = $('#switch-pi-facturar').prop('checked');
    localStorage.setItem('active', active);

    await new Promise(resolve => {
        Poster.orders.getActive()
            .then(async function (order) {
                await updateOrderComment(active, order.order.comment);
                if (active) {
                    showNotification_v1('success', 'Facturación Activada', 'Esta orden será procesada para facturar.');
                } else {
                    showNotification_v1('info', 'Facturación Desactivada', 'Esta orden NO será procesada para facturar.');
                }
                resolve();
            });
    });

    if (active) {
        localStorage.setItem('clientRFC', $('select[id=selectRFC] option:selected').text());
        localStorage.setItem('clientName', $('#txtName').val());
        localStorage.setItem('clientPhone', $('#txtTelefono').val());
        localStorage.setItem('clientAddress', $('#txtAddress').val());
        localStorage.setItem('clientEmail', $('#txtEmail').val());
        localStorage.setItem('clientTarjeta', $('select[id=selectTarjeta] option:selected').text());
        localStorage.setItem('clientCFDI', $('select[id=selectCFDI] option:selected').val() + '-' + $('select[id=selectCFDI] option:selected').text());
        localStorage.setItem('clientObservations', $('#facturaObservaciones').val());
    } else {
        localStorage.setItem('clientRFC', '');
        localStorage.setItem('clientName', '');
        localStorage.setItem('clientPhone', '');
        localStorage.setItem('clientAddress', '');
        localStorage.setItem('clientEmail', '');
        localStorage.setItem('clientTarjeta', '');
        localStorage.setItem('clientCFDI', '');
        localStorage.setItem('clientObservations', '');
    }
}

/**
 * Actualiza los comentarios de la orden con la informacion correspondientes.
 * @param {Boolean} active El estado activo del proceso de facturacion.
 * @param {String} comment El comentario vinculado a la orden.
 */
function updateOrderComment(active, comment) { // manejo de comentarios en las ordenes
    return new Promise(resolve => {
        let str = comment.replace('&Facturado', '');
        if (active) {
            Poster.orders.setOrderComment(dataOrder.order.id, str + '&Facturado');
            resolve();
        } else {
            Poster.orders.setOrderComment(dataOrder.order.id, str);
            resolve();
        }
    });
}

/**
 * Despliega la ventana para la alta de un nuevo RFC.
 */
$(document).on('click', '#btnNuevoRFC', () => {
    Swal.update({ html: html_alta_rfc });
    $('#altaTel').val(_client.phone);
    $('#altaEmail').val(_client.email);
});

//#endregion

/**********************************************************************************************************/

//#region FUNCIONES ADAPTADAS PARA LA VERSIÓN 2 DEL CIERRE DE VENTA.

const ID_NACIONAL = 647; // 647 ID NACIONAL

let numpad_blocked = false;

let efectivo = 0;
let tarjeta = 0;
let transferencia = 0;
let folioTransferencia = "";
let subTotal = 0;
let vuelto = 0;
let tipoVenta = "";
let fechaVenta = "";
let fechaEntrega = "";
let asked_for_credit = false;
let solicitante_nacional = "";
let comentarios = "";
let id_tarjeta_trello = null;
let tag = "";
let abono_id_anticipo = 0;

function init_v2() {
    numpad_blocked = false;
    efectivo = 0;
    tarjeta = 0;
    transferencia = 0;
    folioTransferencia = "";
    subTotal = 0;
    vuelto = 0;
    tipoVenta = "";
    fechaVenta = "";
    fechaEntrega = "";
    asked_for_credit = false;
    solicitante_nacional = "";
    comentarios = "";
    id_tarjeta_trello = null;
    tag = "";
    abono_id_anticipo = 0;

    $('#pi-input-soli-nacional').val('');
    $('#pi-input-archivos').val('');
    $('#div-input-archivos').show();
    $('#pi-pt-comprobante').val('');
}

/**
 * Inicia el proceso de cierre de venta de acuerdo al tipo de venta.
 * @version 2 -> Adaptado para trabajar en conjunto con el manejador de registros.
 */
async function cerrarVenta() {
    if (!isAllValidationsOk()) return;

    $('#btn-pi-pagar').prop('disabled', true);

    Swal.fire({
        title: 'Procesando...',
        timer: 500,
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
            Swal.stopTimer();
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
            showNotification('success', 'Listo :)', '', true);
        }
    });

    obtenerDatosEntrada();
    establecerFechas();
    await registrarVentaPoster();
    await procesarFacturacion();
    await generarTicket();
    if ($('#switch-pi-late-prod').prop('checked') === false) await generarTarjetaTrello();

    numpad_blocked = false;
    $('#btn-pi-pagar').prop('disabled', false);
    Swal.resumeTimer();
}

/**
 * Realiza las validaciones correspondientes y devuelve **true** si todo esta correcto.
 */
function isAllValidationsOk() {

    if (jQuery.isEmptyObject(dataOrder.order.products)) {
        showNotification('info', 'Aviso', 'No puede cerrar ventas vacías.');
        return false;
    }

    if (isCreditClient && $('#input-pi-tag').val().trim() === '') {
        showNotification('info', 'Aviso', 'El campo TAG es obligatorio para los clientes a crédito.');
        return false;
    }

    if ($('#switch-pi-prod').prop('checked') || $('#switch-pi-late-prod').prop('checked')) {
        if ($('#pi-fecha').val() === '') {
            showNotification('info', 'Aviso', 'Debe especificar una fecha de entrega.');
            return false;
        }

        if ($('#pi-hora').val() === '0') {
            showNotification('info', 'Aviso', 'Debe especificar una hora de entrega.');
            return false;
        }

        if ($('#pi-sucursal-prod').val() === '0') {
            showNotification('info', 'Aviso', 'Debe especificar la sucursal de producción.');
            return false;
        }

        if ($('#pi-sucursal-deliv').val() === '0') {
            showNotification('info', 'Aviso', 'Debe especificar la sucursal de entrega.');
            return false;
        }
    }

    if (Math.abs($('#pi-input-transfer').val()) > 0 && $('#pi-pt-comprobante').val() === '') {
        showNotification('info', 'Aviso', 'Debe proporcionar el comprobante para el pago por transferencia.');
        return false;
    }

    if (dataOrder.order.clientId === ID_NACIONAL && $('#pi-input-soli-nacional').val().trim() === '') {
        showNotification('info', 'Aviso', 'Debe especificar el nombre de la persona que solicita el trabajo para NACIONAL.');
        $('#div-soli-nacional').show();
        return false;
    }

    if (isCreditClient && tipo_venta !== 'CRÉDITO' && asked_for_credit === false) {
        Swal.fire({
            title: 'Sugerencia',
            text: 'El tipo de venta sugerido para este cliente es CRÉDITO, ¿desea procesarlo como tal?',
            type: 'question',
            showCancelButton: true,
            confirmButtonText: 'Procesar como CRÉDITO',
            cancelButtonText: 'No, gracias',
            allowOutsideClick: false
        }).then((result) => {
            if (result.value) {
                setTipoPago('credito');
            } else {
                asked_for_credit = true;
                cerrarVenta();
            }
        });
        return false;
    }

    if ($('#switch-pi-prod').prop('checked') || $('#switch-pi-late-prod').prop('checked')) {
        if (entregaAntesDeHoy()) {
            showNotification('info', 'Aviso', 'No puede agendar ordenes de trabajos para días pasados.');
            return false;
        }

        let produce_otra_sucursal = parseInt($('#pi-sucursal-prod').val()) !== Poster.settings.spotId;

        if (getHoraActual() >= 12 && produce_otra_sucursal && entregaEsHoy()) {
            showNotification('info', 'Aviso', 'A partir del medio día, las ordenes de trabajo producidas en otra sucursal no pueden ser agendadas para el día de hoy.');
            return false;
        }

        if (entregaEsHoy() && produce_otra_sucursal && parseInt($('#pi-hora').val()) < 18) { // 18 hrs = 6 pm
            showNotification('info', 'Aviso', 'No puede agendar para antes de las 6 p.m. una orden que será procesada en otra sucursal.');
            return false;
        }
    }

    return true;
}

function getHoraActual() {
    let date = new Date();
    return date.getHours();
}

/**
 * Devuelve el dia actual en formato **yyyy-mm-dd**
 */
function getDiaActual() {
    let date = new Date().toLocaleDateString();
    date = date.split('/');
    date = date.reverse();

    let year = date[0];
    let month = date[1];
    let day = date[2];

    if (parseInt(month) < 10) month = "0" + month;
    if (parseInt(day) < 10) day = "0" + day;

    date = year + "-" + month + "-" + day;

    return date;
}

function entregaEsHoy() {
    let fecha_entrega = $('#pi-fecha').val(); //yyyy-mm-dd
    return fecha_entrega === getDiaActual();
}

/**
 * Devuelve **true** si la fecha de entrega seleccionada es antes de la fecha actual. **false** de otra manera.
 */
function entregaAntesDeHoy() {
    let today = new Date(getDiaActual());
    let fecha_entrega = new Date($('#pi-fecha').val());

    if (fecha_entrega.getTime() < today.getTime()) {
        //fecha es anterior a hoy
        return true;
    } else {
        return false;
    }
}

/**
 * Obtiene todos los valores de entrada base para las operaciones.
 */
function obtenerDatosEntrada() {
    efectivo = Math.abs($('#pi-input-cash').val());
    tarjeta = Math.abs($('#pi-input-card').val());
    transferencia = Math.abs($('#pi-input-transfer').val());
    folioTransferencia = $('#pi-input-ref').val();
    subTotal = efectivo + tarjeta + transferencia;
    subTotal = parseFloat(subTotal.toFixed(2));
    solicitante_nacional = $('#pi-input-soli-nacional').val().trim();
    comentarios = $('#pi-comentarios').val().trim();

    //console.log('efectivo', efectivo);
    //console.log('tarjeta', tarjeta);
    //console.log('transferencia', transferencia);
    //console.log('folioTransferencia', folioTransferencia);
    //console.log('subtotal', subTotal);
    //console.log('total venta', data.order.total);
    //console.log('vuelto', vuelto);
}

/**
 * Establece las fechas de venta y entrega en el formato correcto.
 */
function establecerFechas() {
    let fecha, anio, mes, dia, hora;
    fechaVenta = new Date().toLocaleString();
    if ($('#switch-pi-prod').prop('checked') || $('#switch-pi-late-prod').prop('checked')) {
        fecha = $('#pi-fecha').val();
        fecha = fecha.split('-');
        anio = fecha[0];
        mes = fecha[1];
        dia = fecha[2];
        hora = $('select[id=pi-hora] option:selected').text();
    } else {
        fecha = fechaVenta;
        fecha = fecha.split(" ");
        hora = fecha[1];
        fecha = fecha[0];
        fecha = fecha.split("/");
        dia = fecha[0];
        if (parseInt(dia) < 10) dia = "0" + dia;
        mes = fecha[1];
        if (parseInt(mes) < 10) mes = "0" + mes;
        anio = fecha[2];
    }
    fechaEntrega = dia + "/" + mes + "/" + anio + " " + hora;
}

/**
 * Registra la venta en Poster según sea el caso: **Normal**, **Anticipo**, **Crédito** o **Anticipo sin pago**.
 */
function registrarVentaPoster() {
    return new Promise(async resolve => {
        switch (tipo_venta) {
            case 'ANTICIPO':
                tipoVenta = "anticipo";
                await ventaAnticipo();
                break;
            case 'CRÉDITO':
                tipoVenta = "credito";
                await ventaCredito();
                break;
            case 'SIN PAGO':
                tipoVenta = "anticipo"; // SIN PAGO es un anticipo en ceros.
                await ventaSinPago();
                break;
            case 'CASAINVITA':
                tipoVenta = "casainvita"
                await ventaCasaInvita();
                break;
            default:
                tipoVenta = "normal";
                await ventaNormal();
        }
        resolve();
    });
}

/**
 * Cierra la transacción (venta) en Poster. La suma de los parametros de entrada debe ser igual al total de la venta.
 * @param {Number} payed_cash Efectivo.
 * @param {Number} payed_card Tarjeta.
 * @param {Number} payed_cert Certificado.
 * @param {Boolean} on_the_house Indica si la casa invita. **false** por defecto.
 */
function closeTransaction(payed_cash, payed_card, payed_cert, on_the_house = false) {
    return new Promise(resolve => {
        let datos;

        if (!on_the_house) {
            datos = {
                spot_id: Poster.settings.spotId,
                spot_tablet_id: Poster.settings.spotTabletId,
                transaction_id: dataOrder.order.orderName,
                payed_cash: payed_cash,
                payed_card: payed_card,
                payed_cert: payed_cert
            };
        } else {
            datos = {
                spot_id: Poster.settings.spotId,
                spot_tablet_id: Poster.settings.spotTabletId,
                transaction_id: dataOrder.order.orderName,
                payed_cash: 0,
                payed_card: 0,
                payed_cert: 0,
                reason: 2 // Ver https://dev.joinposter.com/en/docs/v3/web/transactions/closeTransaction?id=transactionsclosetransaction-close-an-order
            };
        }

        Poster.makeApiRequest('transactions.closeTransaction', {
            method: 'post',
            data: datos,
        }, (result) => {
            console.log('result: ', result);
            if (result) {
                if (result.err_code === 0) {
                    // exito
                    resolve();
                } else {
                    // falla
                    showNotification('error', 'Error', 'No se ha podido completar la operación.\nCódigo de error: ' + result.err_code);
                    $('#btn-pi-pagar').prop('disabled', false);
                    return;
                }
            } else {
                // falla
                showNotification('error', 'Error', 'No se ha podido completar la operación.\nError: ' + result);
                $('#btn-pi-pagar').prop('disabled', false);
                return;
            }
        });
    });
}

function agregarComentarios() {
    let _comentario = " | ";

    if (dataOrder.order.clientId === ID_NACIONAL) {
        _comentario += "Solicitante Nacional: " + solicitante_nacional + " | ";
    }

    _comentario += comentarios;

    if (comentarios !== '') {
        return _comentario;
    } else {
        return "";
    }
}

function ventaNormal() {
    return new Promise(async resolve => {

        if (subTotal < dataOrder.order.total) {
            Swal.fire(
                'Aviso',
                'Faltan $' + (vuelto === 0 ? dataOrder.order.total : -vuelto) + " para poder cerrar la venta.",
                'info'
            );
            $('#btn-pi-pagar').prop('disabled', false);
            return;
        }

        let payed_cash = efectivo;
        let payed_card = tarjeta;
        let payed_cert = transferencia;

        console.log('total', dataOrder.order.total);
        console.log('payed cash', payed_cash);
        console.log('payed card', payed_card);
        console.log('payed cert', payed_cert);

        if (vuelto > 0) {
            if (parseFloat((payed_cash - vuelto).toFixed(2)) > 0) {
                payed_cash = parseFloat((payed_cash - vuelto).toFixed(2));
            } else {
                if (parseFloat((payed_card - vuelto).toFixed(2)) > 0) {
                    payed_card = parseFloat((payed_card - vuelto).toFixed(2));
                } else {
                    payed_cert = parseFloat((payed_cert - vuelto).toFixed(2));
                }
            }
        }

        console.log('final payed cash', payed_cash);
        console.log('final payed card', payed_card);
        console.log('final payed cert', payed_cert);
        console.log('vuelto', vuelto);

        await new Promise(resolve => {
            Poster.orders.getActive()
                .then(function (order) {
                    if (transferencia > 0) {
                        let tag = '&PT:' + payed_cert.toFixed(2) + ':E=' + payed_cash.toFixed(2) + ':T=' + payed_card.toFixed(2) + ': :' + folioTransferencia;
                        Poster.orders.setOrderComment(dataOrder.order.id, order.order.comment + tag + agregarComentarios());
                        resolve();
                    } else {
                        Poster.orders.setOrderComment(dataOrder.order.id, order.order.comment + agregarComentarios());
                        resolve();
                    }
                });
        });

        if (transferencia > 0) {
            await subirComprobante();
        }

        await closeTransaction(payed_cash, payed_card, payed_cert);

        resolve();
    });
}

function subirComprobante() {
    return new Promise(resolve => {
        let files = $('#pi-pt-comprobante')[0].files;

        let len = files.length;

        let datos = new FormData();

        datos.append('num_ticket', dataOrder.order.orderName);

        for (let i = 0; i < len; i++) {
            datos.append('file-' + i, files[i]);
        }

        $.ajax({
            url: 'url/Pos/subir_comprobante',
            data: datos,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST'
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

function ventaAnticipo() {
    return new Promise(async resolve => {

        if (subTotal >= dataOrder.order.total) {
            Swal.fire(
                'Aviso',
                'El monto del anticipo no puede ser igual o mayor al monto total.',
                'info'
            );
            $('#btn-pi-pagar').prop('disabled', false);
            return;
        }

        if (subTotal < dataOrder.order.total * .5) {
            showNotification('info', 'Aviso', 'El monto del anticipo debe ser de al menos el 50% de la venta.');
            $('#btn-pi-pagar').prop('disabled', false);
            return;
        }

        await new Promise(resolve => {
            Swal.fire({
                title: '¿Proceder?',
                text: "La venta se registrará con un anticipo de $" + subTotal,
                type: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3c98f7',
                cancelButtonColor: '#d55',
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.value) {

                    Swal.fire({
                        title: 'Procesando...',
                        timer: 500,
                        allowOutsideClick: false,
                        onBeforeOpen: () => {
                            Swal.showLoading();
                            Swal.stopTimer();
                        }
                    }).then((result) => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            showNotification('success', 'Listo :)', '', true);
                        }
                    });

                    let str = "&Venta Anticipo:E=" + efectivo + ":T=" + tarjeta + ":Tr=" + transferencia + ":F=" + folioTransferencia;
                    await new Promise(resolve => {
                        Poster.orders.getActive()
                            .then(function (order) {
                                Poster.orders.setOrderComment(dataOrder.order.id, order.order.comment + str + agregarComentarios());
                                resolve();
                            });
                    });

                    if (transferencia > 0) {
                        await subirComprobante();
                    }

                    await closeTransaction(efectivo, tarjeta, ((dataOrder.order.total - subTotal) + transferencia));

                    await new Promise(resolve => {
                        fecha_venta = new Date().toLocaleString();

                        let datos = {
                            client_id: dataOrder.order.clientId,
                            num_ticket: dataOrder.order.orderName,
                            monto: dataOrder.order.total,
                            nombre_cliente: client_name,
                            fecha_venta: new Date().toJSON().slice(0, 10),
                            sucursal_id: Poster.settings.spotId,
                            pago_inicial: subTotal,
                            fecha: fecha_venta,
                            asesor: asesor_name_venta,
                            asesor_id: asesor_id_venta,
                            efectivo: efectivo,
                            tarjeta: tarjeta,
                            transfer: transferencia,
                            folio: folioTransferencia,
                            tags: getFormatTag($('#input-pi-tag').val().trim(), true),
                            json: localStorage.getItem('productos_obj_' + dataOrder.order.orderName),
                            descuento: _client.discount
                        };

                        $.ajax({
                            type: 'POST',
                            data: datos,
                            url: 'url/Pos/guardar_anticipo',
                            dataType: 'json',
                            encoded: true
                        }).done(function (data) {
                            console.log('DATA ANTICIPO', data);
                            abono_id_anticipo = data;
                            resolve();
                        }).fail(function (xhr, textStatus, errorThrown) {
                            console.error('FALLA AL GUARDAR ANTICIPO EN SERVIDOR');
                            sendEmailNotification("FALLA AL GUARDAR ANTICIPO EN SERVIDOR", Poster.settings.spotId, JSON.stringify(datos));
                            resolve();
                        });
                    });

                    resolve();

                } else {
                    $('#btn-pi-pagar').prop('disabled', false);
                    return;
                }
            });
        });

        resolve();
    });
}

function ventaCredito() {
    return new Promise(async resolve => {

        await new Promise(resolve => {
            Poster.orders.getActive()
                .then(function (order) {
                    Poster.orders.setOrderComment(dataOrder.order.id, order.order.comment + "&Venta a Crédito" + agregarComentarios());
                    resolve();
                });
        });

        await closeTransaction(0, 0, dataOrder.order.total);

        await new Promise(resolve => {

            let datos = {
                client_id: dataOrder.order.clientId,
                num_ticket: dataOrder.order.orderName,
                monto: dataOrder.order.total,
                nombre_cliente: client_name,
                fecha_venta: new Date().toJSON().slice(0, 10),
                sucursal_id: Poster.settings.spotId,
                asesor_id: asesor_id_venta,
                tags: getFormatTag($('#input-pi-tag').val().trim(), true),
                json: localStorage.getItem('productos_obj_' + dataOrder.order.orderName),
                descuento: _client.discount
            };

            $.ajax({
                type: 'POST',
                data: datos,
                url: 'url/Pos/guardar_credito',
                dataType: 'json',
                encoded: true
            }).done(function (data) {
                resolve();
            }).fail(function (xhr, textStatus, errorThrown) {
                console.error('FALLA AL GUARDAR CRÉDITO EN SERVIDOR');
                sendEmailNotification("FALLA AL GUARDAR CRÉDITO EN SERVIDOR", Poster.settings.spotId, JSON.stringify(datos));
                resolve();
            });
        });
        resolve();
    });
}

function ventaSinPago() {
    return new Promise(async resolve => {

        // Se valida de nuevo por si acaso
        if (localStorage.getItem('auth') !== '0') {
            showNotification_v1('info', '¡Acción no permitida!', 'Solo los ENCARGADOS DE SUCURSAL pueden realizar anticipos sin pago.');
            return;
        }

        if (dataOrder.order.total > LIMIT_SIN_PAGO) {
            showNotification_v1('info', 'Información', 'Solo ventas menores o iguales a $' + LIMIT_SIN_PAGO + ' pueden ser registradas como anticipo sin pago.');
            return;
        }

        await new Promise(resolve => {
            Swal.fire({
                title: '¿Proceder?',
                text: "La venta se registrará como ANTICIPO SIN PAGO",
                type: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3c98f7',
                cancelButtonColor: '#d55',
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.value) {

                    Swal.fire({
                        title: 'Procesando...',
                        timer: 500,
                        allowOutsideClick: false,
                        onBeforeOpen: () => {
                            Swal.showLoading();
                            Swal.stopTimer();
                        }
                    }).then((result) => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            showNotification('success', 'Listo :)', '', true);
                        }
                    });

                    let str = "&Venta Anticipo:E=" + efectivo + ":T=" + tarjeta + ":Tr=" + transferencia + ":F=" + folioTransferencia;
                    await new Promise(resolve => {
                        Poster.orders.getActive()
                            .then(function (order) {
                                Poster.orders.setOrderComment(dataOrder.order.id, order.order.comment + str + agregarComentarios());
                                resolve();
                            });
                    });

                    await closeTransaction(0, 0, dataOrder.order.total);

                    await new Promise(resolve => {
                        fecha_venta = new Date().toLocaleString();
                        let datos = {
                            client_id: dataOrder.order.clientId,
                            num_ticket: dataOrder.order.orderName,
                            monto: dataOrder.order.total,
                            nombre_cliente: client_name,
                            fecha_venta: new Date().toJSON().slice(0, 10),
                            sucursal_id: Poster.settings.spotId,
                            pago_inicial: sub_total,
                            fecha: fecha_venta,
                            asesor: asesor_name_venta,
                            asesor_id: asesor_id_venta,
                            efectivo: efectivo,
                            tarjeta: tarjeta,
                            transfer: transferencia,
                            folio: folioTransferencia,
                            tags: getFormatTag($('#input-pi-tag').val().trim(), true),
                            json: localStorage.getItem('productos_obj_' + dataOrder.order.orderName),
                            descuento: _client.discount
                        };

                        $.ajax({
                            type: 'POST',
                            data: datos,
                            url: 'url/Pos/guardar_anticipo',
                            dataType: 'json',
                            encoded: true
                        }).done(function (data) {
                            resolve();
                        }).fail(function (xhr, textStatus, errorThrown) {
                            console.error('FALLA AL GUARDAR ANTICIPO SIN PAGO EN SERVIDOR');
                            sendEmailNotification("FALLA AL GUARDAR ANTICIPO SIN PAGO EN SERVIDOR", Poster.settings.spotId, JSON.stringify(datos));
                            resolve();
                        });
                    });

                    resolve();

                } else {
                    $('#btn-pi-pagar').prop('disabled', false);
                    return;
                }
            });
        });

        resolve();
    });
}

/**
 * Cierra la venta en modalidad como **la casa invita**.
 */
function ventaCasaInvita() {
    return new Promise(async resolve => {

        await new Promise(resolve => {
            Poster.orders.getActive()
                .then(function (order) {
                    Poster.orders.setOrderComment(dataOrder.order.id, order.order.comment + "&Trabajo Interno" + agregarComentarios());
                    resolve();
                });
        });

        await closeTransaction(0, 0, 0, true);

        resolve();
    });
}

/**
 * Genera el ticket de la venta.
 */
function generarTicket(tipo) {
    let needPrint = isPrintTicketActive();
    return new Promise(resolve => {
        lona_desc = getLonasDescription(dataOrder.order.orderName);
        lona_desc = lona_desc.replace('&Lonas#', '');
        lona_desc = lona_desc.replace(/\n/g, '<br>');

        Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + dataOrder.order.orderName, {
            method: 'get'
        }, (productList) => {
            let datos;
            switch (tipoVenta) {
                case 'credito':
                    datos = {
                        total: dataOrder.order.total,
                        importe: 0,
                        adeudo: dataOrder.order.total,
                        abono: 0,
                        cash: 0,
                        card: 0,
                        transfer: 0,
                        change: 0,
                        ticket: dataOrder.order.orderName,
                        asesor: asesor_name_ticket,
                        cliente: client_name,
                        fecha_venta: fechaVenta,
                        fecha_abono: fechaVenta,
                        fecha_entrega: fechaEntrega,
                        detalles: lona_desc,
                        tag: getFormatTag($('#input-pi-tag').val().trim()),
                        json: localStorage.getItem('productos_obj_' + dataOrder.order.orderName),
                        descuento_cliente: _client.discount
                    };
                    ticketManager.saveTicket(ticketManager.tipo.CREDITO, datos, 0, 0);
                    if (needPrint) printer.printReceipt(printer.tipo.CREDITO, productList, datos);
                    break;
                case 'anticipo':
                    datos = {
                        total: dataOrder.order.total,
                        importe: 0,
                        adeudo: parseFloat((dataOrder.order.total - subTotal).toFixed(2)),
                        abono: subTotal,
                        cash: efectivo,
                        card: tarjeta,
                        transfer: transferencia,
                        change: vuelto,
                        ticket: dataOrder.order.orderName,
                        asesor: asesor_name_ticket,
                        cliente: client_name,
                        fecha_venta: fechaVenta,
                        fecha_abono: fechaVenta,
                        fecha_entrega: fechaEntrega,
                        detalles: lona_desc,
                        tag: getFormatTag($('#input-pi-tag').val().trim()),
                        json: localStorage.getItem('productos_obj_' + dataOrder.order.orderName),
                        descuento_cliente: _client.discount
                    };
                    ticketManager.saveTicket(ticketManager.tipo.ANTICIPO, datos, abono_id_anticipo, 0);
                    if (needPrint) printer.printReceipt(printer.tipo.ANTICIPO, productList, datos);
                    break;
                case 'casainvita':
                    datos = {
                        total: dataOrder.order.total,
                        importe: 0,
                        adeudo: 0,
                        abono: 0,
                        cash: efectivo,
                        card: tarjeta,
                        transfer: transferencia,
                        change: vuelto,
                        ticket: dataOrder.order.orderName,
                        asesor: asesor_name_ticket,
                        cliente: client_name,
                        fecha_venta: fechaVenta,
                        fecha_abono: fechaVenta,
                        fecha_entrega: fechaEntrega,
                        detalles: lona_desc,
                        tag: getFormatTag($('#input-pi-tag').val().trim()),
                        json: localStorage.getItem('productos_obj_' + dataOrder.order.orderName),
                        descuento_cliente: _client.discount
                    };
                    ticketManager.saveTicket(ticketManager.tipo.INTERNA, datos, 0, 0);
                    if (needPrint) printer.printReceipt(printer.tipo.INTERNA, productList, datos, resolve());
                    break;
                default:
                    datos = {
                        total: dataOrder.order.total,
                        importe: 0,
                        adeudo: 0,
                        abono: 0,
                        cash: efectivo,
                        card: tarjeta,
                        transfer: transferencia,
                        change: vuelto,
                        ticket: dataOrder.order.orderName,
                        asesor: asesor_name_ticket,
                        cliente: client_name,
                        fecha_venta: fechaVenta,
                        fecha_abono: fechaVenta,
                        fecha_entrega: fechaEntrega,
                        detalles: lona_desc,
                        tag: getFormatTag($('#input-pi-tag').val().trim()),
                        json: localStorage.getItem('productos_obj_' + dataOrder.order.orderName),
                        descuento_cliente: _client.discount
                    };
                    ticketManager.saveTicket(ticketManager.tipo.VENTA, datos, 0, 0);
                    if (needPrint) printer.printReceipt(printer.tipo.VENTA, productList, datos, resolve());
            }
            resolve();
        });
    });
}

/**
 * Retorna el tag con las correcciones de formato aplicadas.
 * @param {String} raw_tag El tag a procesar.
 */
function getFormatTag(raw_tag, detailed = false) {
    tag = tag.trim();
    let final_tag = '';

    if (detailed) {
        final_tag += '<p><b>TAG:</b> ' + tag + '</p>';

        if (raw_tag.trim() !== '') {
            final_tag += '<p><b>TAG ASESOR:</b> ' + raw_tag.trim() + '</p>';
        }
    } else {
        final_tag += tag;

        if (raw_tag.trim() !== '') {
            final_tag += " | " + raw_tag.trim();
        }
    }

    final_tag = final_tag.replace(/"/g, ' pulgadas');

    final_tag = final_tag.trim();

    return final_tag;
}

/**
 * Genera la tarjeta Trello de la venta.
 */
function generarTarjetaTrello() {
    return new Promise(async resolve => {
        await sendToTrello();
        resolve();
    });
}

/**
 * Empieza el proceso de facturación si es requerido.
 */
function procesarFacturacion() {
    return new Promise(async resolve => {
        if (localStorage.getItem('active') === 'true') {
            await facturar_v2();
        }
        resolve();
    });
}

//#endregion

//#region FUNCIONES DE APOYO.

/**
 * Envia un archivo para adjuntar a una tarjeta Trello.
 * @param {File} file El archivo a adjuntar.
 * @param {Number} cardId El ID de la tarjeta Trello.
 */
async function createAndSendForm_v2(file, cardId) {
    let trelloKey = 'trello key';
    let trelloToken = 'trello token';

    return new Promise(resolve => {
        let formData = new FormData();
        formData.append("key", trelloKey);
        formData.append("token", trelloToken);
        formData.append("file", file);
        formData.append("name", file.name);

        let request = new XMLHttpRequest();
        request.responseType = "json";
        request.onreadystatechange = function () {
            // When we have a response back from the server we want to share it!
            // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/response
            if (request.readyState === 4) {
                let result = JSON.parse(JSON.stringify(request.response, null, 2));
                console.log(result);
                datosArchivos.push([result.name, result.url]);
                resolve(JSON.stringify(request.response));
            }
        }

        request.open("POST", 'https://api.trello.com/1/cards/' + cardId + '/attachments/');
        request.send(formData);
    });
}

function calcularTiempoEntrega() {
    let array_products = [];
    let total_seconds = 0;
    let total_minutes = 0;

    for (let i in dataOrder.order.products) {
        array_products.push(dataOrder.order.products[i].id);
    }

    Poster.products.get(array_products)
        .then((products) => {
            products.forEach(function (element) {
                total_seconds += element.cookingTime;
            });
            total_minutes = total_seconds / 60;
            let tiempo_entrega = parseInt(total_minutes / 24 / 60) + " día(s) " + parseInt(total_minutes / 60 % 24) + " hora(s) " + parseInt(total_minutes % 60) + " minuto(s)";
            if (total_seconds > 0) {
                $('#p-pi-tiempo-entrega').text('Tiempo estimado de entrega: ' + tiempo_entrega);
            } else {
                $('#p-pi-tiempo-entrega').text('');
            }
        });
}

async function generarTagVenta() {
    let array_products = [];

    for (let i in dataOrder.order.products) {
        array_products.push(dataOrder.order.products[i].id);
    }

    let len = array_products.length;

    for (let i = 0; i < len; i++) {
        await new Promise(resolve => {
            Poster.products.getFullName({
                id: array_products[i]
            }).then((prodName) => {
                console.log(prodName);
                let name_parts = prodName.name.split(' ');
                let _len = name_parts.length;

                let min_lgth = 7;

                tag += getFirstWord(name_parts);

                for (let j = 0; j < _len; j++) {
                    if (name_parts[j].length >= min_lgth) {
                        if (!tag.includes(name_parts[j]) && !includesEspecialChar(name_parts[j])) {
                            if (tag === '') {
                                tag += name_parts[j];
                            } else {
                                tag += " " + name_parts[j];
                            }
                        }
                    }
                }

                resolve();
            })
        });
    }

    //$('#input-pi-tag').val(tag);
}

function includesEspecialChar(tag) {
    for (let i = 0; i < 10; i++) {
        if (tag.includes("" + i) || tag.includes('(')
            || tag.includes(')') || tag.includes('[')
            || tag.includes(']') || tag.includes('#')) return true;
    }
    return false;
}

function getFirstWord(tags) {
    for (let i = 0; i < tags.length; i++) {
        if (isNaN(tags[i])) return " " + tags[i];
    }
}

function checkNacional() {
    if (dataOrder.order.clientId === ID_NACIONAL) {
        $('#div-soli-nacional').show();
    } else {
        $('#div-soli-nacional').hide();
    }
}

/**
 * Obtiene la lista de productos agregados en el ticket actual.
 */
async function getListaProductos() {
    let data = dataOrder;
    let productos = [];
    //console.log('PRODUCTOS EN LA LISTA', data.order.products);
    for (let i in data.order.products) {
        let price = data.order.products[i].promotionPrice ? data.order.products[i].promotionPrice : data.order.products[i].price;
        // if (cliente.discount !== 0) price = price * ((100 - cliente.discount) / 100);
        await new Promise(resolve => {
            let product_id = data.order.products[i].id;
            let modification = data.order.products[i].modification ? data.order.products[i].modification : "";
            Poster.products.getFullName({
                id: product_id,
                modification: modification
            }).then((prodName) => {
                console.log('PROCESANDO P', prodName);
                let producto_name = prodName.name;
                producto_name += prodName.modGroupName === '' ? '' : ' [ ' + prodName.modGroupName + ' ]';
                productos.push({
                    cantidad: data.order.products[i].count,
                    descript: producto_name,
                    p_unitario: price,
                    product_id: product_id,
                    modification: modification,
                    etiqueta: ''
                });
                resolve();
            });
        });
    }
    return productos;
}

function current_callback(prod_agrupados, prod_no_agrupados) {
    let productos_obj = {
        'prods_agrupados': prod_agrupados,
        'prods_no_agrupados': prod_no_agrupados
    };

    console.log('productos_obj', productos_obj);
    localStorage.setItem('productos_obj_' + dataOrder.order.orderName, JSON.stringify(productos_obj));

    $('#div-pi-editor').hide();
    $('#div-pi-pagar').show();
}

function mostrarEditor() {
    $('#div-pi-editor').show();
    $('#div-pi-pagar').hide();
}

async function loadEditor() {
    let _productos = await getListaProductos();
    editorDragula = <EditorDragula productos={_productos} callback={current_callback} is_venta={true} />;
    this.setState();
    $('#div-desglosado').hide();
}

//#endregion

export default class PaymentInterface extends React.Component {
    constructor(props) {
        super(props);
        loadEditor = loadEditor.bind(this);
        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    componentDidMount() {
        //super_init();
        loadEditor();
    }

    render() {
        dataOrder = this.props.data;
        console.log('DATA ORDER', dataOrder);
        needclose = false;
        init();
        checkEnableCredit();
        getClient(dataOrder.order.clientId);
        getAsesor();
        checkModulesVersion();
        calcularTiempoEntrega();
        checkNacional();
        generarTagVenta();

        return (
            <div className="container-fluid">
                <div className="row" id="div-pi-editor">
                    <div className="col-sm-12 well well-sm">
                        {editorDragula}
                    </div>
                </div>
                <div className="row" id="div-pi-pagar" hidden>
                    <div className="col-sm-4 well">
                        <div id="divCalculator">
                            <div className="row">
                                <div className="col-sm-12">
                                    <button className="btn btn-default btn-pi btn-esp" onClick={() => addInput(100)}>100</button>
                                    <button className="btn btn-default btn-pi btn-esp" onClick={() => addInput(200)}>200</button>
                                    <button className="btn btn-default btn-pi btn-esp" onClick={() => addInput(500)}>500</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12">
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(7)}>7</button>
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(8)}>8</button>
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(9)}>9</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12">
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(4)}>4</button>
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(5)}>5</button>
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(6)}>6</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12">
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(1)}>1</button>
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(2)}>2</button>
                                    <button className="btn btn-default btn-pi" onClick={() => addInput(3)}>3</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12">
                                    <button className="btn btn-default btn-pi" id="btn-dot" onClick={() => addInput('.')}>.</button>
                                    <button className="btn btn-default btn-pi" id="btn-zero" onClick={() => addInput(0)}>0</button>
                                    <button className="btn btn-default btn-pi" id="btn-backspace" onClick={() => addInput('backspace')}>
                                        <img id="imgBackspace" src="url/dist/img/backspace.svg"></img>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-sm-8">
                        <div id="divPaymentOptions">
                            <div className="row row-pi">
                                <div className="col-sm-12" id="div-pi-totales">
                                    <h3>Total: ${toFixedTrunc(total, 2)}</h3>
                                    <h3>Cambio: $<p id="p-pi-change">0.00</p></h3>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-6">
                                    <div>
                                        <div className="input-group">
                                            <span className="input-group-addon">💵 Efectivo</span>
                                            <input type="number" id="pi-input-cash" className="form-control input-pi" onKeyUp={actualizarVuelto} onChange={actualizarVuelto} onFocus={() => setCurrentInput('cash')} min="0" placeholder="0" />
                                            <span className="input-group-addon">$</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="input-group">
                                            <span className="input-group-addon">💳 Tarjeta</span>
                                            <input type="number" id="pi-input-card" className="form-control input-pi" onKeyUp={actualizarVuelto} onChange={actualizarVuelto} onFocus={() => setCurrentInput('card')} min="0" placeholder="0" />
                                            <span className="input-group-addon">$</span>
                                        </div>
                                    </div>
                                    <div className="alert alert-success" role="alert" id="div-pi-alert" hidden>
                                        <p id="p-pi-alert"></p>
                                        <button className="btn btn-default" id="btn-pi-cancelar" onClick={resetTipoPago}>❌</button>
                                    </div>
                                </div>
                                <div className="col-sm-6">
                                    <div id="div-pi-transfer" hidden>
                                        <div className="input-group">
                                            <span className="input-group-addon">💸 Transf.</span>
                                            <input type="number" id="pi-input-transfer" className="form-control input-pi" onKeyUp={actualizarVuelto} onChange={actualizarVuelto} onFocus={() => setCurrentInput('transfer')} min="0" placeholder="0" />
                                            <span className="input-group-addon">$</span>
                                        </div>
                                        <div className="input-group">
                                            <span className="input-group-addon">📃 Ref.</span>
                                            <input type="text" id="pi-input-ref" className="form-control input-pi" onFocus={() => setCurrentInput('ref')} placeholder="Banco y número de referencia" />
                                        </div>
                                        <div className="input-group">
                                            <span className="input-group-addon">Comprobante</span>
                                            <input type="file" className="form-control input-pi" multiple id="pi-pt-comprobante" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-12">
                                    <div className="input-group">
                                        <span className="input-group-addon">📃 TAG</span>
                                        <input type="text" className="form-control input-pi" id="input-pi-tag" />
                                    </div>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-12 btn-tipo-pagos">
                                    <button className="btn btn-default" id='btn-pi-transfer' onClick={() => setTipoPago('transfer')}>💸 Transf.</button>
                                    <button className="btn btn-default" id='btn-pi-anticipo' onClick={() => setTipoPago('anticipo')}>💰 Anticipo</button>
                                    <button className="btn btn-default" id='btn-pi-credito' onClick={() => setTipoPago('credito')}>🏷️ Crédito</button>
                                    {/*<button className="btn btn-default" id='btn-pi-sinpago' onClick={() => setTipoPago('sinpago')}>❗ Sin pago</button>*/}
                                    <button className="btn btn-default" id='btn-pi-casainvita' onClick={() => setTipoPago('casainvita')}>🔨 MKT Interno</button>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-12 div-pi-switch">
                                    <p className="p-pi-switch" id="p-mandar-prod">Producción</p>
                                    <label className="switch" id="label-pi-produccion">
                                        <input type="checkbox" id="switch-pi-prod" defaultChecked onChange={setProduccion} />
                                        <span className="slider round"></span>
                                    </label>
                                    <div id="div-late-prod" hidden>
                                        <p className="p-pi-switch" id="p-late-prod">Producción más tarde</p>
                                        <label className="switch" id="label-pi-late-prod">
                                            <input type="checkbox" id="switch-pi-late-prod" onChange={setLateProduction} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                    <p className="p-pi-switch" id="p-ticket">Imprimir ticket</p>
                                    <label className="switch">
                                        <input type="checkbox" id="switch-pi-ticket" defaultChecked />
                                        <span className="slider round"></span>
                                    </label>
                                    <button className="btn btn-default" id='btn-pi-facturar' onClick={showViewFacturar}>📤 Facturar</button>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-12 div-pi-switch">
                                    <p className="p-pi-switch">Fecha entrega:</p>
                                    <input className="form-control" type="date" id="pi-fecha" />
                                    <p className="p-pi-switch">Hora:</p>
                                    <select className="form-control" id="pi-hora">
                                        <option value="0">Seleccione</option>
                                        <option value="8">08:00</option>
                                        <option value="9">09:00</option>
                                        <option value="10">10:00</option>
                                        <option value="11">11:00</option>
                                        <option value="12">12:00</option>
                                        <option value="13">13:00</option>
                                        <option value="14">14:00</option>
                                        <option value="15">15:00</option>
                                        <option value="16">16:00</option>
                                        <option value="17">17:00</option>
                                        <option value="18">18:00</option>
                                        <option value="19">19:00</option>
                                        <option value="20">20:00</option>
                                    </select>
                                    <p className="p-pi-switch">Produce:</p>
                                    <select className="form-control" id="pi-sucursal-prod">
                                        <option value="0">Seleccione</option>
                                        <option value="1">Terranorte</option>
                                        <option value="2">Caucel</option>
                                        <option value="5">Matriz</option>
                                    </select>
                                    <p className="p-pi-switch">Entrega:</p>
                                    <select className="form-control" id="pi-sucursal-deliv">
                                        <option value="0">Seleccione</option>
                                        <option value="1">Terranorte</option>
                                        <option value="2">Caucel</option>
                                        <option value="5">Matriz</option>
                                    </select>
                                </div>
                            </div>
                            <div id="div-soli-nacional" hidden>
                                <div className="input-group">
                                    <span className="input-group-addon">👨‍💼</span>
                                    <input type="text" id="pi-input-soli-nacional" className="form-control input-pi" placeholder="Solicitante de Nacional" />
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-4">
                                    <textarea id="pi-comentarios" placeholder="Comentarios"></textarea>
                                </div>
                            </div>
                            <div id="div-input-archivos">
                                <div className="row row-pi">
                                    <div className="col-sm-4">
                                        <span className="input-group-addon">Archivos</span>
                                        <input type="file" className="form-control input-pi" multiple id="pi-input-archivos" />
                                    </div>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <p id="p-pi-tiempo-entrega"></p>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-4">
                                    <button id="btn-pi-editor" className="btn btn-info" style={{marginRight: '5px'}} onClick={mostrarEditor}>Volver al editor</button>
                                    <button id="a-pi-cerrar" className="btn btn-danger" onClick={toggleView}>Cerrar ticket</button>
                                </div>
                                <div className="col-sm-4 col-sm-offset-4">
                                    <button className="btn btn-success" id="btn-pi-pagar" onClick={cerrarVenta}>Pagar</button>
                                </div>
                            </div>
                        </div>
                        <div id="div-pi-cerrar" hidden>
                            <div className="row row-pi">
                                <div className="col-sm-12">
                                    <h2>Cerrar sin pago</h2>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-12">
                                    <div className="radio well well-sm">
                                        <label>
                                            <input type="radio" name="optionsRadios" value="1" defaultChecked />
                                            El cliente se fue
                                        </label>
                                    </div>
                                    <div className="radio well well-sm">
                                        <label>
                                            <input type="radio" name="optionsRadios" value="3" />
                                            Error del asesor
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="row row-pi">
                                <div className="col-sm-4">
                                    <button className="btn btn-default" onClick={toggleView}>Cancelar</button>
                                </div>
                                <div className="col-sm-4 col-sm-offset-4">
                                    <button className="btn btn-danger" id="btn-pi-cerrar" onClick={cerrarSinPago}>Cerrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}