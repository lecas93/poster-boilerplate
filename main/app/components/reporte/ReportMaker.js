import './style.css';
import './report-loader.css';
const email_config = require('./email.json');

import { toFixedTrunc } from '../util/number_format';

import XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import Swal from 'sweetalert2';
import { showNotification } from '../util/notifications';

// const Recibo = require('receipt');
const Recibo = require('../recibo');

let date;
let total_efectivo = 0, total_tarjeta = 0, total_transfer = 0;
let efectivo_pagos = 0, tarjeta_pagos = 0, transfer_pagos = 0;
let facturas_postventa = {};
let cash_per_asesor = {};
let asesor_name, asesor_id;

let folio_merma;
let costo_total;
let reprocesos;

//#endregion

/**
 * Convierte un string a un ArrayBuffer
 * @param {String} s La cadena de texto a convertir.
 * @returns {ArrayBuffer} Un ArrayBuffer.
 */
function s2ab(s) {
    let length = s.length;
    let buf = new ArrayBuffer(length);
    let view = new Uint8Array(buf);

    for (let i = 0; i < length; i++) {
        view[i] = s.charCodeAt(i) & 0xFF;
    }

    return buf;
}

/**
 * Deshabilita los botones.
 */
function bloquearBotones() {
    $('#btnReporte').prop('disabled', true);
    $('#btnReporteAsesor').prop('disabled', true);
    $('#myloader').show();
}

/**
 * Re-habilita los botones.
 */
function desbloquearBotones() {
    $('#btnReporte').prop('disabled', false);
    $('#btnReporteAsesor').prop('disabled', false);
    $('#myloader').hide();
}

//#region Corte Venta del Dia

/**
 * Inicia el proceso para obtener el reporte de venta.
 * @deprecated El reporte ahora se genera de manera local.
 */
function generarReporte() {
    $('#btnReporte').prop('disabled', true);
    let fecha = $('#fecha').val();
    if (fecha !== '') {
        $('#myloader').show();
        Poster.makeRequest('url' + $('#report_type').val() + '.php', {
            headers: [],
            method: 'post',
            data: {
                fecha: fecha
            },
            timeout: 10000
        }, (answer) => {
            //console.log('mod answer: ', answer);            
            if (answer && Number(answer.code) === 200) {
                console.log('creando archivo...');

                let blob = new Blob([answer.result], { type: 'text/csv' });
                let a = window.document.createElement("a");
                a.href = window.URL.createObjectURL(blob);
                let nombreSucursal = '';
                switch (Poster.settings.spotId) {
                    case 1:
                        nombreSucursal = 'Terranorte';
                        break;
                    case 2:
                        nombreSucursal = 'Caucel';
                        break;
                    case 5:
                        nombreSucursal = 'Matriz'
                        break;
                    default:
                        nombreSucursal = 'sin_nombre';
                }
                a.download = "Reporte_" + nombreSucursal + "_" + $('#fecha').val() + ".csv";
                document.body.appendChild(a);
                a.click();  // IE: "Access is denied"; ver: https://connect.microsoft.com/IE/feedback/details/797361/ie-10-treats-blob-url-as-cross-origin-and-denies-access
                document.body.removeChild(a);

                Poster.makeRequest('url/reporte_pagos.php', {
                    headers: [],
                    method: 'post',
                    data: {
                        fecha: fecha
                    },
                    timeout: 10000
                }, (answer) => {
                    if (answer && Number(answer.code) === 200) {

                        let blob = new Blob([answer.result], { type: 'text/csv' });
                        let a = window.document.createElement("a");
                        a.href = window.URL.createObjectURL(blob);
                        let nombreSucursal = '';
                        switch (Poster.settings.spotId) {
                            case 1:
                                nombreSucursal = 'Terranorte';
                                break;
                            case 2:
                                nombreSucursal = 'Caucel';
                                break;
                            case 5:
                                nombreSucursal = 'Matriz'
                                break;
                            default:
                                nombreSucursal = 'sin_nombre';
                        }
                        a.download = "ReportePagos_" + nombreSucursal + "_" + $('#fecha').val() + ".csv";
                        document.body.appendChild(a);
                        a.click();  // IE: "Access is denied"; ver: https://connect.microsoft.com/IE/feedback/details/797361/ie-10-treats-blob-url-as-cross-origin-and-denies-access
                        document.body.removeChild(a);

                        Swal.fire({
                            type: 'success',
                            title: '¡Reportes generados con éxito!'
                        });
                        $('#btnReporte').prop('disabled', false);
                        $('#myloader').hide();
                    }
                });
            } else {
                Swal.fire({
                    type: 'error',
                    title: '¡Un error ha ocurrido!',
                    text: 'Por favor, intente de nuevo.'
                });
                $('#btnReporte').prop('disabled', false);
                $('#myloader').hide();
            }
        });
    } else {
        //alert('Debe especificar una fecha para generar el reporte.');
        Swal.fire({
            type: 'info',
            title: 'Aviso',
            text: 'Debe especificar una fecha para generar el reporte.'
        });
        $('#btnReporte').prop('disabled', false);
    }
}

/**
 * Inicia el proceso para generar el reporte de venta.
 */
function generarReporte_v2() {
    //generarExcel();
    generarExcel_v2();
}

/**
 * Obtiene todas las facturaciones post-venta del día.
 */
function getPostVentas() {
    return new Promise(resolve => {
        let fecha = $('#fecha').val();

        $.ajax({
            type: 'POST',
            data: { fecha: fecha },
            url: 'url/facturas_postventa.php',
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            resolve(data);
        }).fail(function (xhr, textStatus, errorThrown) {
            resolve(false);
        });
    });
}

function getAnotaciones(num_ticket) {
    return new Promise(resolve => {
        $.ajax({
            type: 'POST',
            data: { num_ticket: num_ticket },
            url: 'url/Pos/get_anotaciones',
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            resolve(data.message);
        }).fail(function (xhr, textStatus, errorThrown) {
            resolve(false);
        });
    });
}

/**
 * Obtiene todas las ventas del día.
 */
function getTransactions() {
    return new Promise(resolve => {
        let fecha = $('#fecha').val();

        let query = '&timezone=client&include_products=false&type=spots&id=' + Poster.settings.spotId +
            '&status=2&date_from=' + fecha + '&date_to=' + fecha;

        Poster.makeApiRequest('dash.getTransactions?' + query, {
            method: 'GET'
        }, (result) => {
            resolve(result);
        });
    });
}

/**
 * Obtiene la lista de productos de una venta.
 * @param {Number} id El ID de la venta.
 */
function getProductList(id) {
    return new Promise(resolve => {
        Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + id, {
            method: 'get'
        }, (productList) => {
            resolve(productList);
        });
    });
}

/**
 * Obtiene la lista de pagos del día.
 */
function getPagos() {
    return new Promise(resolve => {
        let fecha = $('#fecha').val();
        let account_id;
        switch (Poster.settings.spotId) {
            case 1:
                account_id = 6;
                break;
            case 2:
                account_id = 4;
                break;
            case 5:
                account_id = 5;
                break;
            default:
                account_id = 5;
        }
        Poster.makeApiRequest('finance.getTransactions?&dateFrom=' + fecha + '&dateTo=' + fecha + '&account_id=' + account_id, {
            method: 'get'
        }, (result) => {
            console.log('finance', result);
            resolve(result);
        });
    });
}

/**
 * Obtiene el nombre completo del cliente.
 * @param {Number} id El ID Poster del cliente.
 */
function getClientFullName(id) {
    return new Promise(resolve => {
        let query = '&client_id=' + id;
        Poster.makeApiRequest('clients.getClient?' + query, {
            method: 'GET'
        }, (result) => {
            if (result !== undefined && result !== "") {
                resolve(result[0].lastname + ' ' + result[0].firstname + ' ' + result[0].patronymic);
            } else {
                resolve('Cliente No Existe (ID: ' + id + ')');
            }
        });
    });
}

/**
 * Comienza el proceso de construcción del reporte como archivo excel.
 * @version 1 -> Los datos de la venta y los pagos estan en hojas separadas.
 * @deprecated
 */
async function generarExcel() {
    $('#btnReporte').prop('disabled', true);
    $('#btnReporteAsesor').prop('disabled', true);
    $('#myloader').show();

    let sucursal = localStorage.getItem('sucursal_' + Poster.settings.spotId);
    let fecha = $('#fecha').val();

    // Se prepara el documento
    let wb = XLSX.utils.book_new();
    wb.Props = {
        Title: 'Reporte de Venta - ' + sucursal + ' - ' + fecha,
        Author: 'Sistemas'
    };

    wb.SheetNames.push("Ventas");
    wb.SheetNames.push("Pagos");

    // Se prepara los datos para la hoja de ventas
    let ws_data = [
        ['Sucursal:', sucursal, '', 'Fecha:', fecha],
        [''],
        ['', 'Cliente', 'Cantidad', 'Codigos', 'Articulos', 'P. Unitario', '# Ticket', 'Estado', 'Fact. Post', 'Total', 'Sin IVA', 'Efectivo', 'Tarjeta', 'Transf.'],
        ['Efectivo:']
    ];

    facturas_postventa = await getPostVentas();

    let pagos_del_dia = await getPagos();
    let abonos_anticipos = [];
    let abonos_creditos = [];
    let total_anticipo = 0, total_credito = 0;

    let transactions = await getTransactions();
    let len = transactions.length;

    total_efectivo = 0;
    total_tarjeta = 0;
    total_transfer = 0;

    let productos_cash = [];
    let productos_card = [];
    let productos_transfer = [];
    let productos_combinado = [];
    let productos_credito = [];
    let productos_anticipo = [];

    cash_per_asesor = {};

    // Separamos las transacciones por tipo de venta
    for (let i = 0; i < len; i++) {
        let name = transactions[i].name;
        if (cash_per_asesor[name] !== undefined) {
            cash_per_asesor[name].push(transactions[i]);
        } else {
            cash_per_asesor[name] = [];
            cash_per_asesor[name].push(transactions[i]);
        }

        let str = transactions[i].transaction_comment;
        if (str !== null) {
            if (str.includes('&Venta Anticipo')) {
                productos_anticipo.push(transactions[i]);
                continue;
            }

            if (str.includes('&Venta a Crédito')) {
                productos_credito.push(transactions[i]);
                continue;
            }

            if (str.includes('&PT')) {
                productos_transfer.push(transactions[i]);
                continue;
            }
        }

        switch (Number(transactions[i].pay_type)) {
            case 1:
                productos_cash.push(transactions[i]);
                break;
            case 2:
                productos_card.push(transactions[i]);
                break;
            default:
                productos_combinado.push(transactions[i]);
        }
    }

    await writeSection(productos_cash, ws_data);
    ws_data.push(['']);
    ws_data.push(['Tarjeta:']);
    await writeSection(productos_card, ws_data);
    ws_data.push(['']);
    ws_data.push(['Combinado:']);
    await writeSection(productos_combinado, ws_data, true);
    ws_data.push(['']);
    ws_data.push(['Transfer.:']);
    await writeSection(productos_transfer, ws_data);
    ws_data.push(['']);
    ws_data.push(['Anticipos:']);
    await writeSection(productos_anticipo, ws_data);
    ws_data.push(['']);
    ws_data.push(['Créditos:']);
    await writeSection(productos_credito, ws_data);

    ws_data.push(['']);
    ws_data.push(['']);
    ws_data.push(['Efectivo', total_efectivo]);
    ws_data.push(['Tarjeta', total_tarjeta]);
    ws_data.push(['Transfer.', total_transfer]);
    ws_data.push(['Total', total_efectivo + total_tarjeta + total_transfer]);

    ws_data.push(['']);
    ws_data.push(['']);

    for (let name in cash_per_asesor) {
        let total_cash_asesor = 0;
        cash_per_asesor[name].forEach((e) => {
            total_cash_asesor += Number(e.payed_cash) / 100;
        });
        ws_data.push([name, total_cash_asesor]);
    }

    // Se agregan los datos al archivo
    let ws = XLSX.utils.aoa_to_sheet(ws_data);

    wb.Sheets['Ventas'] = ws;

    // Se prepara los datos para la hoja de ventas
    ws_data = [
        ['Sucursal:', sucursal, '', 'Fecha:', fecha],
        [''],
        ['', 'Ticket', 'Abono', 'Efectivo', 'Tarjeta', 'Transfer.', 'Folio', 'Asesor', 'Hora']
    ];

    // Separamos los pagos por tipo de venta
    if (pagos_del_dia !== undefined) {
        len = pagos_del_dia.length;
    } else {
        len = 0;
    }

    for (let i = 0; i < len; i++) {
        let category_id = Number(pagos_del_dia[i].category_id);
        switch (category_id) {
            case 14:
                abonos_creditos.push(pagos_del_dia[i]);
                total_credito += Number(pagos_del_dia[i].amount) / 100;
                break;
            case 16:
                abonos_anticipos.push(pagos_del_dia[i]);
                total_anticipo += Number(pagos_del_dia[i].amount) / 100;
                break;
            default:
        }
    }

    ws_data.push(['Crédito']);
    writeSectionPago(abonos_creditos, ws_data);
    ws_data.push(['']);
    ws_data.push(['Anticipo']);
    writeSectionPago(abonos_anticipos, ws_data);
    ws_data.push(['']);
    ws_data.push(['', 'Total']);
    ws_data.push(['Crédito', total_credito]);
    ws_data.push(['Anticipo', total_anticipo]);

    ws = XLSX.utils.aoa_to_sheet(ws_data);

    wb.Sheets['Pagos'] = ws;

    // se guarda y descarga el archivo
    let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

    saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), 'ReporteVenta_' + sucursal + '_' + fecha + '.xlsx');

    $('#btnReporte').prop('disabled', false);
    $('#btnReporteAsesor').prop('disabled', false);
    $('#myloader').hide();

    //showEmailSender();
}

/**
 * Comienza el proceso de construcción del reporte como archivo excel.
 * @version 2 -> Los datos de la venta y los pagos estan en la misma hoja.
 */
async function generarExcel_v2() {
    $('#btnReporte').prop('disabled', true);
    $('#btnReporteAsesor').prop('disabled', true);
    $('#myloader').show();

    let sucursal = localStorage.getItem('sucursal_' + Poster.settings.spotId);
    let fecha = $('#fecha').val();

    // Se prepara el documento
    let wb = XLSX.utils.book_new();
    wb.Props = {
        Title: 'Reporte de Venta - ' + sucursal + ' - ' + fecha,
        Author: 'Sistemas'
    };

    wb.SheetNames.push("Reporte");
    //wb.SheetNames.push("Pagos");

    // Se prepara los datos para la hoja de ventas
    let ws_data = [
        ['Sucursal:', sucursal, '', 'Fecha:', fecha],
        [''],
        ['', 'Cliente', 'Cantidad', 'Codigos', 'Articulos', 'P. Unitario', '# Ticket', 'Estado', 'Fact. Post', 'Total', 'Sin IVA', 'Efectivo', 'Tarjeta', 'Transf.'],
        ['Efectivo:']
    ];

    facturas_postventa = await getPostVentas();

    let pagos_del_dia = await getPagos();
    let abonos_anticipos = [];
    let abonos_creditos = [];
    let total_anticipo = 0, total_credito = 0;

    let transactions = await getTransactions();
    let len = transactions.length;

    total_efectivo = 0;
    total_tarjeta = 0;
    total_transfer = 0;

    efectivo_pagos = 0;
    tarjeta_pagos = 0;
    transfer_pagos = 0;

    let productos_cash = [];
    let productos_card = [];
    let productos_transfer = [];
    let productos_combinado = [];
    let productos_credito = [];
    let productos_anticipo = [];

    cash_per_asesor = {};

    let num_ventas_tarjeta = 0;

    // Separamos las transacciones por tipo de venta
    for (let i = 0; i < len; i++) {
        let name = transactions[i].name;
        if (cash_per_asesor[name] !== undefined) {
            cash_per_asesor[name].push(transactions[i]);
        } else {
            cash_per_asesor[name] = [];
            cash_per_asesor[name].push(transactions[i]);
        }

        let str = transactions[i].transaction_comment;
        if (str !== null) {
            if (str.includes('&Venta Anticipo')) {
                productos_anticipo.push(transactions[i]);
                continue;
            }

            if (str.includes('&Venta a Crédito')) {
                productos_credito.push(transactions[i]);
                continue;
            }

            if (str.includes('&PT')) {
                productos_transfer.push(transactions[i]);
                continue;
            }
        }

        switch (Number(transactions[i].pay_type)) {
            case 1:
                productos_cash.push(transactions[i]);
                break;
            case 2:
                productos_card.push(transactions[i]);
                break;
            default:
                productos_combinado.push(transactions[i]);
        }
    }

    num_ventas_tarjeta = productos_card.length;

    await writeSection(productos_cash, ws_data);
    ws_data.push(['']);
    ws_data.push(['Tarjeta:']);
    await writeSection(productos_card, ws_data);
    ws_data.push(['']);
    ws_data.push(['Combinado:']);
    await writeSection(productos_combinado, ws_data, true);
    ws_data.push(['']);
    ws_data.push(['Transfer.:']);
    await writeSection(productos_transfer, ws_data);
    ws_data.push(['']);
    ws_data.push(['Anticipos:']);
    await writeSection(productos_anticipo, ws_data);
    ws_data.push(['']);
    ws_data.push(['Créditos:']);
    await writeSection(productos_credito, ws_data);

    ws_data.push(['']);
    ws_data.push(['NÚM. VENTAS C/TARJETA', num_ventas_tarjeta]);

    ws_data.push(['']);
    ws_data.push(['']);
    ws_data.push(['MONTO DE VENTA']);
    ws_data.push(['Efectivo', total_efectivo]);
    ws_data.push(['Tarjeta', total_tarjeta]);
    ws_data.push(['Transfer.', total_transfer]);
    ws_data.push(['Total', total_efectivo + total_tarjeta + total_transfer]);

    ws_data.push(['']);
    ws_data.push(['']);

    ws_data.push(['MONTO DE PAGOS']);
    ws_data.push(['', 'Ticket', 'Abono', 'Efectivo', 'Tarjeta', 'Transfer.', 'Folio', 'Asesor', 'Hora']);

    // Separamos los pagos por tipo de venta
    if (pagos_del_dia !== undefined) {
        len = pagos_del_dia.length;
    } else {
        len = 0;
    }

    let account_id;
    switch (Poster.settings.spotId) {
        case 1:
            account_id = 6;
            break;
        case 2:
            account_id = 4;
            break;
        case 5:
            account_id = 5;
            break;
        default:
            account_id = 5;
    }

    for (let i = 0; i < len; i++) {
        if (parseInt(pagos_del_dia[i].account_id) === account_id) {
            let category_id = Number(pagos_del_dia[i].category_id);
            switch (category_id) {
                case 14:
                    abonos_creditos.push(pagos_del_dia[i]);
                    total_credito += Number(pagos_del_dia[i].amount) / 100;
                    break;
                case 16:
                    abonos_anticipos.push(pagos_del_dia[i]);
                    total_anticipo += Number(pagos_del_dia[i].amount) / 100;
                    break;
                default:
            }
        }
    }

    //

    ws_data.push(['Crédito']);
    writeSectionPago(abonos_creditos, ws_data);
    ws_data.push(['']);
    ws_data.push(['Anticipo']);
    writeSectionPago(abonos_anticipos, ws_data);
    ws_data.push(['']);
    ws_data.push(['Total']);
    ws_data.push(['Crédito', total_credito]);
    ws_data.push(['Anticipo', total_anticipo]);

    ws_data.push(['']);
    ws_data.push(['']);

    console.log('TOTAL EFECTIVO', total_efectivo);
    console.log('EFECTIVO PAGOS', efectivo_pagos);

    let efectivo_final = total_efectivo + efectivo_pagos;
    let tarjeta_final = total_tarjeta + tarjeta_pagos;
    let transfer_final = total_transfer + transfer_pagos;

    ws_data.push(['MONTO TOTAL FINAL']);
    ws_data.push(['Efectivo', efectivo_final]);
    ws_data.push(['Tarjeta', tarjeta_final]);
    ws_data.push(['Transfer.', transfer_final]);
    ws_data.push(['Total', efectivo_final + tarjeta_final + transfer_final]);

    ws_data.push(['']);
    ws_data.push(['EFECTIVO EN CAJA:', '_______________']);

    /* Esta información se obtiene del corte de asesor*/

    ws_data.push(['']);
    ws_data.push(['']);
    ws_data.push(['EFECTIVO POR ASESOR']);

    let tam = 0;
    if (pagos_del_dia !== undefined && pagos_del_dia !== null) {
        tam = pagos_del_dia.length;
    }

    console.log('PAGOS DEL DIA', pagos_del_dia);

    for (let name in cash_per_asesor) {
        let total_cash_asesor = 0;
        cash_per_asesor[name].forEach((e) => {
            total_cash_asesor += Number(e.payed_cash) / 100;
        });

        let asesor_id = parseInt(cash_per_asesor[name][0].user_id);
        // Ahora se agrega el efectivo de los pagos
        for (let i = 0; i < tam; i++) {
            let waiter_id = parseInt(pagos_del_dia[i].user_id);
            let comment = pagos_del_dia[i].comment;
            let nombre_asesor = getAsesorNameFromComment(comment);

            if (/*waiter_id === asesor_id*//*comment.includes(name)*/nombre_asesor === name) {
                let category_id = Number(pagos_del_dia[i].category_id);
                if (category_id === 14 || category_id === 16) {
                    let lineas = pagos_del_dia[i].comment;
                    lineas = lineas.split(',');

                    console.log('ASESOR ID', asesor_id);
                    console.log('WAITER ID', waiter_id);
                    console.log('LINEAS 3', lineas[3]);
                    total_cash_asesor += parseFloat(lineas[3].replace('E:', ''));
                    //tarjeta_pagos += Number(lineas[4].replace('T:', ''));
                    //transfer_pagos += Number(lineas[5].replace('Tr:', ''));
                }
            }
        }
        ws_data.push([name, total_cash_asesor]);
    }

    let wscols = [
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 40 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 }
    ];

    // Se agregan los datos al archivo
    let ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws['!cols'] = wscols;

    wb.Sheets['Reporte'] = ws;

    // se guarda y descarga el archivo
    let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

    saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), 'ReporteVenta_' + sucursal + '_' + fecha + '.xlsx');

    $('#btnReporte').prop('disabled', false);
    $('#btnReporteAsesor').prop('disabled', false);
    $('#myloader').hide();

    //showEmailSender();
}

/**
 * Construye una sección del reporte de acuerdo a los datos proporcionados.
 * @param {Array} data El arreglo con los datos a procesar.
 * @param {Array} ws_data El arreglo para almacenar los datos procesados.
 * @param {Boolean} ext Indica si el pago es combinado.
 */
async function writeSection(data, ws_data, ext = false) {
    return new Promise(async resolve => {
        let len = data.length;
        let total_need_update = false;
        for (let i = 0; i < len; i++) {
            total_need_update = false;

            let p = await getProductList(data[i].transaction_id);
            if (p[0] === undefined) continue;

            let anotaciones = await getAnotaciones(data[i].transaction_id);

            let client_name = await getClientFullName(data[i].client_id);

            let length = p.length;

            let efectivo = 0;
            let tarjeta = 0;
            let transfer = 0;

            for (let j = 0; j < length; j++) {
                let num = parseInt(p[j].num);
                let payed_sum = Number(p[j].payed_sum) / 100;
                let product_price = Number(p[j].product_sum) / 100;

                //let cliente = data[i].client_lastname + ' ' + data[i].client_firstname;
                let cliente = client_name;
                let cantidad = num;
                let articulo = p[j].product_name + ' [ ' + p[j].modificator_name + ' ]';
                let p_unitario = product_price / num;
                let num_ticket = data[i].transaction_id;
                let estado = data[i].transaction_comment;

                let fact_post = '';
                for (let fp in facturas_postventa) {
                    if (facturas_postventa[fp].num_ticket === data[i].transaction_id) {
                        fact_post = 'Facturado';
                        break;
                    }
                }

                let sub_total = payed_sum;
                let sin_iva = toFixedTrunc(sub_total / 1.16, 2);

                if (estado !== null) {
                    let strings = estado.split('&');
                    if (estado.includes('&PT')) {
                        let len = strings.length;
                        for (let i = 0; i < len; i++) {
                            if (strings[i].includes('PT:')) {
                                let tags = strings[i].split(':');
                                transfer = tags[1];
                                efectivo = tags[2].replace('E=', '');
                                tarjeta = tags[3].replace('T=', '');

                                total_need_update = true;
                                break;
                            }
                        }
                    }

                    if (estado.includes('&Venta Anticipo')) {
                        let len = strings.length;
                        for (let i = 0; i < len; i++) {
                            if (strings[i].includes('Anticipo:')) {
                                let tags = strings[i].split(':');
                                efectivo = tags[1].replace('E=', '');
                                tarjeta = tags[2].replace('T=', '');
                                transfer = tags[3].replace('Tr=', '');

                                total_need_update = true;
                                break;
                            }
                        }
                    }
                }

                if (ext) {
                    efectivo = Number(data[i].payed_cash) / 100;
                    tarjeta = Number(data[i].payed_card) / 100;
                }

                ws_data.push(['', cliente, cantidad, '', articulo, p_unitario, num_ticket, estado + " " + anotaciones, fact_post, sub_total, sin_iva, efectivo, tarjeta, transfer]);
            }

            if (!total_need_update) {
                total_efectivo += Number(data[i].payed_cash) / 100;
                total_tarjeta += Number(data[i].payed_card) / 100;
            } else {
                total_efectivo += Number(efectivo);
                total_tarjeta += Number(tarjeta);
                total_transfer += Number(transfer);
            }
        }
        resolve(true);
    });
}

/**
 * Construye la sección de pagos de acuerdo a los datos proporcionados.
 * @param {Array} data El arreglo con los datos a procesar.
 * @param {Array} ws_data El arreglo para almacenar los datos procesados.
 */
function writeSectionPago(data, ws_data) {
    data.forEach((e) => {
        let lineas = e.comment;
        lineas = lineas.split(',');

        let ticket = lineas[0].split(':');
        ticket = ticket[1];

        let asesor = lineas[1].split(':');
        asesor = asesor[1];

        let hora = lineas[2].split(':');
        hora = hora[1] + ':' + hora[2] + ':' + hora[3];

        let pago = Number(e.amount) / 100;

        let efectivo = lineas[3].split(':');
        efectivo = efectivo[1];
        console.log('EFECTIVO ADD', efectivo);
        efectivo_pagos += parseFloat(efectivo);

        let tarjeta = lineas[4].split(':');
        tarjeta = tarjeta[1];
        tarjeta_pagos += parseFloat(tarjeta);

        let transfer = lineas[5].split(':');
        transfer = transfer[1];
        transfer_pagos += parseFloat(transfer);

        let folio = lineas[6].split(':');
        folio = folio[1];

        ws_data.push(['', ticket, pago, efectivo, tarjeta, transfer, folio, asesor, hora]);
    });
}

//#endregion

//#region Corte Individual por Asesor

/**
 * Genera el corte del asesor en un archivo excel.
 * @version 1
 * @deprecated
 */
async function generarReporteAsesor() {

    $('#btnReporte').prop('disabled', true);
    $('#btnReporteAsesor').prop('disabled', true);
    $('#myloader').show();

    let efectivo = 0, tarjeta = 0, transfer = 0;
    let efectivo_pagos = 0, tarjeta_pagos = 0, transfer_pagos = 0;

    let asesor_id = await getAsesorId();
    let ventas_asesor = await getTransactionsAsesor(asesor_id);
    let pagos_del_dia = await getPagos();

    let fecha = $('#fecha').val();

    // Se prepara el documento
    let wb = XLSX.utils.book_new();
    wb.Props = {
        Title: 'Corte Asesor - ' + asesor_name + ' - ' + fecha,
        Author: 'Sistemas'
    };

    wb.SheetNames.push("Corte");

    // Se prepara los datos para la hoja de ventas
    let ws_data = [
        ['Asesor:', asesor_name],
        ['Fecha:', fecha],
        ['']
    ];

    let len;
    if (ventas_asesor !== undefined) {
        len = ventas_asesor.length;
    } else {
        len = 0;
    }

    for (let i = 0; i < len; i++) {

        let comment = ventas_asesor[i].transaction_comment;

        if (comment !== null) {
            if (comment.includes('&Venta a Crédito')) continue;

            let strings = comment.split('&');

            if (comment.includes('&PT')) {
                let len = strings.length;
                for (let i = 0; i < len; i++) {
                    if (strings[i].includes('PT:')) {
                        let tags = strings[i].split(':');
                        transfer += Number(tags[1]);
                        efectivo += Number(tags[2].replace('E=', ''));
                        tarjeta += Number(tags[3].replace('T=', ''));
                        break;
                    }
                }
                continue;
            }

            if (comment.includes('&Venta Anticipo')) {
                let len = strings.length;
                for (let i = 0; i < len; i++) {
                    if (strings[i].includes('Anticipo:')) {
                        let tags = strings[i].split(':');
                        efectivo += Number(tags[1].replace('E=', ''));
                        tarjeta += Number(tags[2].replace('T=', ''));
                        transfer += Number(tags[3].replace('Tr=', ''));
                        break;
                    }
                }
                continue;
            }
        }

        efectivo += Number(ventas_asesor[i].payed_cash) / 100;
        tarjeta += Number(ventas_asesor[i].payed_card) / 100;

    }

    ws_data.push(['Ventas']);
    ws_data.push(['Efectivo:', toFixedTrunc(efectivo, 2)]);
    ws_data.push(['Tarjeta:', toFixedTrunc(tarjeta, 2)]);
    ws_data.push(['Transfer:', toFixedTrunc(transfer, 2)]);
    ws_data.push(['']);

    if (pagos_del_dia !== undefined) {
        len = pagos_del_dia.length;
    } else {
        len = 0;
    }

    for (let i = 0; i < len; i++) {
        let waiter_id = Number(pagos_del_dia[i].user_id);
        if (waiter_id === asesor_id) {
            let category_id = Number(pagos_del_dia[i].category_id);
            if (category_id === 14 || category_id === 16) {
                let lineas = pagos_del_dia[i].comment;
                lineas = lineas.split(',');

                efectivo_pagos += Number(lineas[3].replace('E:', ''));
                tarjeta_pagos += Number(lineas[4].replace('T:', ''));
                transfer_pagos += Number(lineas[5].replace('Tr:', ''));
            }
        }
    }

    ws_data.push(['Pagos']);
    ws_data.push(['Efectivo:', toFixedTrunc(efectivo_pagos, 2)]);
    ws_data.push(['Tarjeta:', toFixedTrunc(tarjeta_pagos, 2)]);
    ws_data.push(['Transfer:', toFixedTrunc(transfer_pagos, 2)]);
    ws_data.push(['']);
    ws_data.push(['Total']);
    ws_data.push(['Efectivo:', toFixedTrunc(efectivo + efectivo_pagos, 2)]);
    ws_data.push(['Tarjeta:', toFixedTrunc(tarjeta + tarjeta_pagos, 2)]);
    ws_data.push(['Transfer:', toFixedTrunc(transfer + transfer_pagos, 2)]);

    let ws = XLSX.utils.aoa_to_sheet(ws_data);

    wb.Sheets['Corte'] = ws;

    // se guarda y descarga el archivo
    let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

    saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), 'Corte_' + asesor_name + '_' + fecha + '.xlsx');

    $('#btnReporte').prop('disabled', false);
    $('#btnReporteAsesor').prop('disabled', false);
    $('#myloader').hide();
}

/**
 * Genera el corte del asesor como un ticket.
 * @version 2 - Los cortes de asesor ahora se generan como tickets.
 * @deprecated
 */
async function generarReporteAsesor_v2() {

    bloquearBotones();

    let efectivo = 0, tarjeta = 0, transfer = 0;
    let efectivo_pagos = 0, tarjeta_pagos = 0, transfer_pagos = 0;

    let asesor_id = await getAsesorId();
    let ventas_asesor = await getTransactionsAsesor(asesor_id);
    let pagos_del_dia = await getPagos();

    let fecha = $('#fecha').val();

    Recibo.config.currency = '$';
    Recibo.config.ruler = '=';

    let tipo_transaccion = '-- CORTE ASESOR --';
    let sucursal = '';

    switch (Poster.settings.spotId) {
        case 1:
            sucursal = "Terranorte";
            break;
        case 2:
            sucursal = "Caucel";
            break;
        case 5:
            sucursal = "Matriz";
            break;
        default:
    }

    //
    let len = ventas_asesor.length;

    for (let i = 0; i < len; i++) {

        let comment = ventas_asesor[i].transaction_comment;

        if (comment !== null) {
            if (comment.includes('&Venta a Crédito')) continue;

            let strings = comment.split('&');

            if (comment.includes('&PT')) {
                let len = strings.length;
                for (let i = 0; i < len; i++) {
                    if (strings[i].includes('PT:')) {
                        let tags = strings[i].split(':');
                        transfer += Number(tags[1]);
                        efectivo += Number(tags[2].replace('E=', ''));
                        tarjeta += Number(tags[3].replace('T=', ''));
                        break;
                    }
                }
                continue;
            }

            if (comment.includes('&Venta Anticipo')) {
                let len = strings.length;
                for (let i = 0; i < len; i++) {
                    if (strings[i].includes('Anticipo:')) {
                        let tags = strings[i].split(':');
                        efectivo += Number(tags[1].replace('E=', ''));
                        tarjeta += Number(tags[2].replace('T=', ''));
                        transfer += Number(tags[3].replace('Tr=', ''));
                        break;
                    }
                }
                continue;
            }
        }

        efectivo += Number(ventas_asesor[i].payed_cash) / 100;
        tarjeta += Number(ventas_asesor[i].payed_card) / 100;

    }

    len = pagos_del_dia.length;
    for (let i = 0; i < len; i++) {
        let waiter_id = Number(pagos_del_dia[i].user_id);
        if (waiter_id === asesor_id) {
            let category_id = Number(pagos_del_dia[i].category_id);
            if (category_id === 14 || category_id === 16) {
                let lineas = pagos_del_dia[i].comment;
                lineas = lineas.split(',');

                efectivo_pagos += Number(lineas[3].replace('E:', ''));
                tarjeta_pagos += Number(lineas[4].replace('T:', ''));
                transfer_pagos += Number(lineas[5].replace('Tr:', ''));
            }
        }
    }
    //

    const output = Recibo.create([
        {
            type: 'text', value: [
                'EMPRESA',
                sucursal
            ], align: 'center'
        },
        { type: 'empty' },
        { type: 'text', value: tipo_transaccion, align: 'center', padding: 0 },
        { type: 'empty' },
        {
            type: 'properties', lines: [
                { name: 'Asesor', value: asesor_name },
                { name: 'Fecha', value: fecha }
            ]
        },
        { type: 'empty' },
        { type: 'text', value: 'Ventas', align: 'left', padding: 0 },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: '$' + toFixedTrunc(efectivo, 2) },
                { name: 'Tarjeta', value: '$' + toFixedTrunc(tarjeta, 2) },
                { name: 'Transfer.', value: '$' + toFixedTrunc(transfer, 2) }
            ]
        },
        { type: 'empty' },
        { type: 'text', value: 'Pagos', align: 'left', padding: 0 },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: '$' + toFixedTrunc(efectivo_pagos, 2) },
                { name: 'Tarjeta', value: '$' + toFixedTrunc(transfer_pagos, 2) },
                { name: 'Transfer.', value: '$' + toFixedTrunc(transfer_pagos, 2) }
            ]
        },
        { type: 'empty' },
        { type: 'text', value: 'Total', align: 'left', padding: 0 },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: '$' + toFixedTrunc(efectivo + efectivo_pagos, 2) },
                { name: 'Tarjeta', value: '$' + toFixedTrunc(tarjeta + tarjeta_pagos, 2) },
                { name: 'Transfer.', value: '$' + toFixedTrunc(transfer + transfer_pagos, 2) }
            ]
        },
        /*
        { type: 'empty' },
        { type: 'text', value: '<b>Pago:</b>', align: 'left' },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: 'AUD XX.XX' },
                { name: 'Cambio', value: 'AUD XX.XX' }
            ]
        },
        */
        /*
        { type: 'empty' },
        { type: 'text', value: sucursal_dir, align: 'center', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Este ticket <b>NO ES UN COMPROBANTE FISCAL.</b>', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Es obligación de nuestro personal darte una remisión o una factura impresa al término de la compra. Exígela.', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Si requiere factura, deberá solicitarla al momento de la compra, ya que esta venta se incluye en la factura global del día.', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* ¿Dudas, quejas o sugerencias? Escribenos a: <b>email</b>', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Para pedidos por favor escribenos a: <b>' + sucursal_email + '</b>', align: 'left', padding: 0 }
        */
    ]);

    let img64 = "data:image/png;base64,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";
    let iframe = document.createElement('iframe');
    iframe.name = 'iframe';
    iframe.style.position = "absolute";
    iframe.style.top = "-5000px";
    document.body.appendChild(iframe);
    let frameDoc = (iframe.contentWindow) ? iframe.contentWindow : (iframe.contentDocument.document) ? iframe.contentDocument.document : iframe.contentDocument;
    frameDoc.document.open();
    frameDoc.document.write("<!DOCTYPE html><html><head><style>@page { size: auto;  margin: 0mm; } body {background-color:#FFFFFF; border: solid 0px black; margin: 0px;}</style></head><body><img style='margin-left: 75px;' src='" + img64 + "'><pre>" + output + "</pre></body></html>");
    frameDoc.document.close();

    setTimeout(() => {
        window.frames['iframe'].focus();
        window.frames['iframe'].print();
        document.body.removeChild(iframe);
    }, 250);

    desbloquearBotones();
}

/**
 * Genera el corte del asesor como un ticket.
 * @version 3 - El corte de asesor solo muestra sus montos de la sucursal donde lo genera. Tambien muestra información base del reporte de merma.
 */
async function generarReporteAsesor_v3() {

    bloquearBotones();

    let efectivo = 0, tarjeta = 0, transfer = 0;
    let efectivo_pagos = 0, tarjeta_pagos = 0, transfer_pagos = 0;

    let asesor_id = await getAsesorId();
    let ventas_asesor = await getTransactionsAsesor(asesor_id);
    let pagos_del_dia = await getPagos();

    let fecha = $('#fecha').val();

    Recibo.config.currency = '$';
    Recibo.config.ruler = '=';

    let tipo_transaccion = '-- CORTE ASESOR --';
    let sucursal = '';

    let formated_folio_merma = folio_merma;
    if (folio_merma < 100) formated_folio_merma = "0" + folio_merma;
    if (folio_merma < 10) formated_folio_merma = "00" + folio_merma;

    switch (Poster.settings.spotId) {
        case 1:
            sucursal = "Terranorte";
            break;
        case 2:
            sucursal = "Caucel";
            break;
        case 5:
            sucursal = "Matriz";
            break;
        default:
    }

    //
    let len = 0;
    if (ventas_asesor !== undefined && ventas_asesor !== null) {
        len = ventas_asesor.length;
    } else {
        len = 0;
    }

    for (let i = 0; i < len; i++) {

        if (parseInt(ventas_asesor[i].spot_id) === Poster.settings.spotId) {

            let comment = ventas_asesor[i].transaction_comment;

            if (comment !== null) {
                if (comment.includes('&Venta a Crédito')) continue;

                let strings = comment.split('&');

                if (comment.includes('&PT')) {
                    let len = strings.length;
                    for (let i = 0; i < len; i++) {
                        if (strings[i].includes('PT:')) {
                            let tags = strings[i].split(':');
                            transfer += Number(tags[1]);
                            efectivo += Number(tags[2].replace('E=', ''));
                            tarjeta += Number(tags[3].replace('T=', ''));
                            break;
                        }
                    }
                    continue;
                }

                if (comment.includes('&Venta Anticipo')) {
                    let len = strings.length;
                    for (let i = 0; i < len; i++) {
                        if (strings[i].includes('Anticipo:')) {
                            let tags = strings[i].split(':');
                            efectivo += Number(tags[1].replace('E=', ''));
                            tarjeta += Number(tags[2].replace('T=', ''));
                            transfer += Number(tags[3].replace('Tr=', ''));
                            break;
                        }
                    }
                    continue;
                }
            }

            efectivo += Number(ventas_asesor[i].payed_cash) / 100;
            tarjeta += Number(ventas_asesor[i].payed_card) / 100;
        }

    }

    let account_id;
    switch (Poster.settings.spotId) {
        case 1:
            account_id = 6;
            break;
        case 2:
            account_id = 4;
            break;
        case 5:
            account_id = 5;
            break;
        default:
            account_id = 5;
    }

    if (pagos_del_dia !== undefined && pagos_del_dia !== null) {
        len = pagos_del_dia.length;
    } else {
        len = 0;
    }

    for (let i = 0; i < len; i++) {
        if (parseInt(pagos_del_dia[i].account_id) === account_id) {

            let waiter_id = Number(pagos_del_dia[i].user_id);
            let comment = pagos_del_dia[i].comment;
            let nombre_asesor = getAsesorNameFromComment(comment);

            if (/*waiter_id === asesor_id*//*comment.includes(asesor_name)*/nombre_asesor === asesor_name) {
                let category_id = Number(pagos_del_dia[i].category_id);
                if (category_id === 14 || category_id === 16) {
                    let lineas = pagos_del_dia[i].comment;
                    lineas = lineas.split(',');

                    efectivo_pagos += Number(lineas[3].replace('E:', ''));
                    tarjeta_pagos += Number(lineas[4].replace('T:', ''));
                    transfer_pagos += Number(lineas[5].replace('Tr:', ''));
                }
            }
        }
    }
    //

    const output = Recibo.create([
        {
            type: 'text', value: [
                'EMPRESA',
                sucursal
            ], align: 'center'
        },
        { type: 'empty' },
        { type: 'text', value: tipo_transaccion, align: 'center', padding: 0 },
        { type: 'empty' },
        {
            type: 'properties', lines: [
                { name: 'Asesor', value: asesor_name },
                { name: 'Fecha', value: fecha }
            ]
        },
        { type: 'empty' },
        { type: 'text', value: 'Ventas', align: 'left', padding: 0 },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: '$' + toFixedTrunc(efectivo, 2) },
                { name: 'Tarjeta', value: '$' + toFixedTrunc(tarjeta, 2) },
                { name: 'Transfer.', value: '$' + toFixedTrunc(transfer, 2) }
            ]
        },
        { type: 'empty' },
        { type: 'text', value: 'Pagos', align: 'left', padding: 0 },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: '$' + toFixedTrunc(efectivo_pagos, 2) },
                { name: 'Tarjeta', value: '$' + toFixedTrunc(tarjeta_pagos, 2) },
                { name: 'Transfer.', value: '$' + toFixedTrunc(transfer_pagos, 2) }
            ]
        },
        { type: 'empty' },
        { type: 'text', value: 'Total', align: 'left', padding: 0 },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: '$' + toFixedTrunc(efectivo + efectivo_pagos, 2) },
                { name: 'Tarjeta', value: '$' + toFixedTrunc(tarjeta + tarjeta_pagos, 2) },
                { name: 'Transfer.', value: '$' + toFixedTrunc(transfer + transfer_pagos, 2) }
            ]
        },
        { type: 'empty' },
        { type: 'text', value: '<b>Reporte de merma</b>', align: 'left', padding: 0 },
        {
            type: 'properties', lines: [
                { name: 'Folio', value: 'M-' + formated_folio_merma },
                { name: 'Costo total', value: '$' + costo_total },
                { name: 'Reprocesos', value: reprocesos }
            ]
        },
        /*
        { type: 'empty' },
        { type: 'text', value: '<b>Pago:</b>', align: 'left' },
        {
            type: 'properties', lines: [
                { name: 'Efectivo', value: 'AUD XX.XX' },
                { name: 'Cambio', value: 'AUD XX.XX' }
            ]
        },
        */
        /*
        { type: 'empty' },
        { type: 'text', value: sucursal_dir, align: 'center', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Este ticket <b>NO ES UN COMPROBANTE FISCAL.</b>', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Es obligación de nuestro personal darte una remisión o una factura impresa al término de la compra. Exígela.', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Si requiere factura, deberá solicitarla al momento de la compra, ya que esta venta se incluye en la factura global del día.', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* ¿Dudas, quejas o sugerencias? Escribenos a: <b>email</b>', align: 'left', padding: 0 },
        { type: 'empty' },
        { type: 'text', value: '* Para pedidos por favor escribenos a: <b>' + sucursal_email + '</b>', align: 'left', padding: 0 }
        */
    ]);

    let img64 = "data:image/png;base64,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";
    let iframe = document.createElement('iframe');
    iframe.name = 'iframe';
    iframe.style.position = "absolute";
    iframe.style.top = "-5000px";
    document.body.appendChild(iframe);
    let frameDoc = (iframe.contentWindow) ? iframe.contentWindow : (iframe.contentDocument.document) ? iframe.contentDocument.document : iframe.contentDocument;
    frameDoc.document.open();
    frameDoc.document.write("<!DOCTYPE html><html><head><style>@page { size: auto;  margin: 0mm; } body {background-color:#FFFFFF; border: solid 0px black; margin: 0px;}</style></head><body><img style='margin-left: 75px;' src='" + img64 + "'><pre>" + output + "</pre></body></html>");
    frameDoc.document.close();

    setTimeout(() => {
        window.frames['iframe'].focus();
        window.frames['iframe'].print();
        document.body.removeChild(iframe);
    }, 250);

    desbloquearBotones();
}

function getAsesorNameFromComment(comment){
    console.log('COMMENT', comment);
    if(!comment.includes('Abono de Ticket:')) return "";
    let arr = comment.split(',');
    let arr_asesor = arr[1].split(':');
    let asesor_name = arr_asesor[1];
    asesor_name = asesor_name.trim();
    console.log('ASESOR NAME FROM COMMENT', asesor_name);
    return asesor_name;
}

/**
 * Obtiene el ID Poster del asesor.
 */
function getAsesorId() {
    return new Promise(resolve => {
        Poster.users.getActiveUser().then((user) => {
            if (!user) {
                return;
            }

            //console.log(user.name);
            asesor_name = user.name;
            asesor_id = user.id;
            resolve(user.id);
        });
    });
}

/**
 * Obtiene las ventas del día de un asesor.
 * @param {Number} asesor_id El ID Poster del asesor.
 */
function getTransactionsAsesor(asesor_id) {
    return new Promise(resolve => {
        let fecha = $('#fecha').val();

        let query = '&timezone=client&include_products=false&type=waiters&id=' + asesor_id +
            '&status=2&date_from=' + fecha + '&date_to=' + fecha;

        Poster.makeApiRequest('dash.getTransactions?' + query, {
            method: 'GET'
        }, (result) => {
            resolve(result);
        });
    });
}

/**
 * Llama al servidor para confirmar si ya se ha registrado una merma en el día.
 */
async function checarRegistroMerma() {

    if ($('#fecha').val().trim() === '') {
        showNotification('info', 'Aviso', 'El campo de fecha no puede estar vacío.');
        return;
    }

    $('#btn-verificar-merma').prop('disabled', true);

    await getAsesorId();

    let data = {
        'sucursal_id': Poster.settings.spotId,
        'asesor_id': asesor_id,
        'fecha_registro': $('#fecha').val().trim(),
    };

    $.ajax({
        type: 'POST',
        url: 'url/Pos/check_merma',
        data: data,
        dataType: 'json',
        encode: true
    }).done(function (data) {
        console.log('DONE', data);
        if (data.status === 0) {
            showDivReporte();
            $('#div-registro-merma').hide();
            $('#div-generar-reportes').show();
            $('#btn-verificar-merma').prop('disabled', false);
            folio_merma = parseInt(data.result[0].folio_merma);
            costo_total = data.result[0].costo_total;
            reprocesos = data.result[0].reprocesos;
        } else {
            showNotification('error', 'Error', data.message);
            $('#btn-verificar-merma').prop('disabled', false);
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error('FAIL', xhr.responseText);
        showNotification('error', 'Error', 'Un error ha ocurrido. Por favor, intente de nuevo.');
        $('#btn-verificar-merma').prop('disabled', false);
    });
}

/**
 * Envia al servidor la información proporcionada sobre la merma del día.
 */
async function registrarMerma() {

    if (isEmptyInputs()) {
        showNotification('info', 'Aviso', 'No puede dejar campos en blanco.');
        return;
    }

    $('#btn-registrar-merma').prop('disabled', true);

    await getAsesorId();

    let date = new Date().toLocaleString();
    date = date.split(' ');

    let hora_registro = date[1];
    /*let fecha = date[0];

    fecha = fecha.split('/');

    let dia = fecha[0];
    if (parseInt(dia) < 10) dia = "0" + dia;
    let mes = fecha[1];
    if (parseInt(mes) < 10) mes = "0" + mes;
    let anio = fecha[2];*/

    //let fecha_registro = anio + "-" + mes + "-" + dia;
    let fecha_registro = $('#input-fecha-merma').val().trim();

    folio_merma = parseInt($('#inputFolio').val().trim());
    costo_total = parseFloat($('#inputCosto').val().trim());
    reprocesos = parseInt($('#inputReprocesos').val().trim());

    let data = {
        'sucursal_id': Poster.settings.spotId,
        'folio_merma': folio_merma,
        'asesor_id': asesor_id,
        'asesor': asesor_name,
        'costo_total': costo_total,
        'reprocesos': reprocesos,
        'fecha_registro': fecha_registro,
        'hora_registro': hora_registro
    };

    $.ajax({
        type: 'POST',
        url: 'url/Pos/registrar_merma',
        data: data,
        dataType: 'json',
        encode: true
    }).done(function (data) {
        console.log('DONE', data);
        if (data.status === 0) {
            showNotification('success', 'Éxito', data.message);
            showDivReporte();
            $('#div-registro-merma').hide();
            $('#div-generar-reportes').show();
            $('#btn-registrar-merma').prop('disabled', false);
        } else {
            showNotification('error', 'Error', data.message);
            $('#btn-registrar-merma').prop('disabled', false);
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error('FAIL', xhr.responseText);
        if (xhr.responseText.includes('Duplicate entry')) {
            showNotification('info', 'Duplicado', 'El folio ' + folio_merma + ' ya se encuentra registrado.');
            $('#btn-registrar-merma').prop('disabled', false);
        } else {
            showNotification('error', 'Error', 'No se ha podido guardar el registro. Por favor, intente de nuevo.');
            $('#btn-registrar-merma').prop('disabled', false);
        }
    });
}

/**
 * Devuelve **true** si no hay inputs vacios. **false** de otro modo.
 */
function isEmptyInputs() {
    if ($('#input-fecha-merma').val().trim() === '') {
        return true;
    }
    if ($('#inputFolio').val().trim() === '') {
        return true;
    }
    if ($('#inputCosto').val().trim() === '') {
        return true;
    }
    if ($('#inputReprocesos').val().trim() === '') {
        return true;
    }
    return false;
}

/**
 * Oculta la seccion para bajar el reporte de venta y el corte de asesor.
 */
function showDivMerma() {
    $('#divFolioMerma').show();
    $('#divReport').hide();
}

/**
 * Muestra la seccion para bajar el reporte de venta y el corte de asesor.
 */
function showDivReporte() {
    $('#divFolioMerma').hide();
    $('#divReport').show();

    $('#inputFolio').val('');
    $('#inputCosto').val('');
    $('#inputReprocesos').val('');
}

//#endregion

export default class ReportMaker extends React.Component {
    constructor(props) {
        super(props);
        date = new Date().toJSON().slice(0, 10);
        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    render() {
        $('#myloader').hide();
        return (
            <div>
                <div id="divFolioMerma" hidden>
                    <h3>Ingrese los siguientes datos:</h3>
                    <p>Fecha:</p>
                    <input id="input-fecha-merma" type="text" readOnly />
                    <br />
                    <p>Folio merma:</p>
                    <input id="inputFolio" type="number" />
                    <br />
                    <p>Costo total:</p>
                    <input id="inputCosto" type="number" />
                    <br />
                    <p>Número de reprocesos:</p>
                    <input id="inputReprocesos" type="number" />
                    <br />
                    <button id="btn-reporte-regresar" className="btn-gray" onClick={showDivReporte}>Regresar</button>
                    <button className="btn-green" id="btn-registrar-merma" onClick={registrarMerma}>Listo</button>
                </div>
                <div className='report' id="divReport">
                    <h1>Seleccione fecha</h1>
                    <br />
                    <input type="date" id="fecha" defaultValue={date} />
                    <br />
                    {/*<select id="report_type">
                        <option value='reporte_venta_ticket'>Reporte por Ticket</option>
                        <option value='reporte_venta'>Reporte General</option>
                    </select>
                    <br />*/}
                    <div id="div-registro-merma">
                        <button className="btn-green" id="btn-registro-merma" onClick={() => { showDivMerma(); $('#input-fecha-merma').val($('#fecha').val()); }}>Registrar Merma</button>
                        <button className="btn-green" id="btn-verificar-merma" onClick={checarRegistroMerma}>Ya he registrado merma</button>
                    </div>
                    <div id="div-generar-reportes" hidden>
                        <button className="btn-green" id="btnReporte" onClick={generarReporte_v2} disabled={false}>Reporte Venta Diaria</button>
                        <button className="btn-green" id="btnReporteAsesor" onClick={generarReporteAsesor_v3} disabled={false}>Reporte Corte Asesor</button>
                    </div>
                    <div id="myloader" hidden={true}>
                        <div className="lds-facebook"><div></div><div></div><div></div></div>
                    </div>
                </div>
            </div>
        );
    }
}