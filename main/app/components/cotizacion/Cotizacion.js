import './style.css';
import ErrorAviso from '../aviso/ErrorAviso';
import EditorDragula from './EditorDragula';
import template_html from '../util/templates/cotizacion_template.html';
import { showNotification } from '../util/notifications';
import Swal from 'sweetalert2';
import swal from 'sweetalert';
import '../reporte/report-loader.css';

//import jsPDF from 'jspdf';

let data;
let asesor_name, asesor_id;
let cliente;
let tag, tag_asesor;
let is_credit_client = false;
let editorDragula = null;

/**
 * Obtiene la lista de todas las cotizaciones generadas en el rango de fechas seleccionadas.
 */
function obtenerCotizaciones() {
    clearTable();
    $('#coti-div-loader').show();

    let inicio = $('#coti-fecha-inicio').val();
    let fin = $('#coti-fecha-fin').val();

    //inicio = getFormatedDate(inicio);
    //fin = getFormatedDate(fin);

    inicio = getFormatoFecha(inicio);
    fin = getFormatoFecha(fin);

    console.log(inicio);

    $.ajax({
        type: 'GET',
        url: 'url/Pos/obtener_cotizaciones',
        data: {
            fecha_inicio: inicio,
            fecha_fin: fin,
            client_id: cliente.id
        },
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log(data);
        fillTable(data.result);
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr);
    }).always(function () {
        $('#coti-div-loader').hide();
    });
}

function getFormatedDate(date) {
    let fecha = date.split('-');
    return parseInt(fecha[2]) + "/" + parseInt(fecha[1]) + "/" + fecha[0];
}

function clearTable() {
    let tbody = $('#coti-tbody')[0];
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
}

function fillTable(data) {
    let tbody = $('#coti-tbody')[0];
    //while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    for (let i = 0, len = data.length; i < len; i++) {
        let tr = document.createElement('tr');

        tr.appendChild(createColumn(data[i].id));
        tr.appendChild(createColumn(getSucursalName(data[i].sucursal_id)));
        tr.appendChild(createColumn(data[i].total));
        tr.appendChild(createColumn(data[i].fecha));
        tr.appendChild(createColumn(data[i].hora));
        tr.appendChild(createColumn(data[i].folio));
        tr.appendChild(createColumn(data[i].asesor_name));

        let tag, tag_asesor;
        data[i].tag !== null ? tag = "TAG: " + data[i].tag : tag = "";
        data[i].tag_asesor !== null ? tag_asesor = "\nTAG ASESOR: " + data[i].tag_asesor : tag_asesor = "";
        tr.appendChild(createColumn(tag + tag_asesor));

        let tdAcciones = document.createElement('td');

        let btnImprimir = document.createElement('button');
        btnImprimir.className = "btn btn-primary";
        btnImprimir.style.marginBottom = "5px";
        btnImprimir.innerText = "Imprimir";
        btnImprimir.onclick = function () { recuperarCotizacion(data[i]) };

        let btnCargar = document.createElement('button');
        btnCargar.className = "btn btn-success";
        btnCargar.innerText = "Cargar Orden";
        btnCargar.onclick = function () { cargarCotizacionPoster(data[i].id, parseInt(data[i].descuento)) };

        tdAcciones.appendChild(btnImprimir);
        tdAcciones.appendChild(btnCargar);
        tr.appendChild(tdAcciones);

        tbody.appendChild(tr);
    }
}

function createColumn(data) {
    let td = document.createElement('td');
    td.innerText = data;
    return td;
}

/**
 * Añade todos los productos registrados en la cotizacion al ticket actual.
 * @param {String | Number} cotizacion_id 
 */
async function cargarCotizacionPoster(cotizacion_id, descuento) {
    showLoading();

    let num_productos = 0;

    await new Promise(resolve => {
        $.ajax({
            type: 'GET',
            url: 'url/Pos/get_products_coti',
            data: {
                cotizacion_id: cotizacion_id
            },
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            console.log(data);
            if (data.status !== 0) {
                showNotification('error', 'Un error ha ocurrido', 'Status: ' + data.status + '. Por favor, intente de nuevo.');
                return;
            } else {
                clearOrderPoster();
                num_productos = data.result.length;
                for (let i = 0; i < num_productos; i++) {
                    addProductOrderPoster(data.result[i]);
                }
                resolve();
            }
        }).fail(function (xhr, textStatus, errorThrown) {
            showNotification('error', 'Error', xhr);
            return;
        });
    });

    let errors = "";

    if (descuento && cliente.discount !== descuento) errors += '<b>* Descuento distinto:</b>Descuento personal registrado en la cotizacion (' + descuento + '%) no concuerda con el descuento personal actual (' + cliente.discount + '%)<br/><br/>';

    let num_prods_added = 0;
    await new Promise(resolve => {
        Poster.orders.getActive()
            .then(function (result) {
                for (let i in result.order.products) {
                    num_prods_added++;
                }
                resolve();
            });
    });

    if (num_prods_added !== num_productos) errors += "<b>* Uno o más productos eliminados:</b> El número de productos registrados en la cotización [" + num_productos + "] no coincide con el número de productos cargados al ticket [" + num_prods_added + "].<br/><br/>";

    if (errors) {
        showNotification('info', 'Incidencias encontradas', errors);
    } else {
        showNotification('success', 'Listo', '', true);
    }
}

/**
 * Quita todos los productos en el ticket actual.
 */
function clearOrderPoster() {
    let order_id = data.order.id;
    for (let i in data.order.products) {
        let id = data.order.products[i].id;
        let modification = data.order.products[i].modification;
        Poster.orders.changeProductCount(order_id, { id: id, modification: modification, count: 0 });
    }
}

/**
 * Añade el producto al ticket actual.
 * @param {JSON} product 
 */
function addProductOrderPoster(product) {
    try {
        let order_id = data.order.id;
        Poster.orders.addProduct(order_id, { id: parseInt(product.product_id), modification: product.modification });
        if (product.modification !== "") {
            Poster.orders.changeProductCount(order_id, { id: parseInt(product.product_id), modification: product.modification, count: parseInt(product.cantidad) });
        } else {
            Poster.orders.changeProductCount(order_id, { id: parseInt(product.product_id), count: parseInt(product.cantidad) });
        }
    } catch (error) {
        console.error('ERROR AL CARGAR PRODUCTO:', product);
        console.error(error);
    }
}

/**
 * Obtiene la lista de productos agregados en el ticket actual.
 */
async function getListaProductos() {
    let productos = [];
    console.log('PRODUCTOS EN LA LISTA', data.order.products);
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
                productos.push({ cantidad: data.order.products[i].count, descript: producto_name, p_unitario: price, product_id: product_id, modification: modification });
                resolve();
            });
        });
    }
    return productos;
}

function createRowProducto(producto) {
    let tr = document.createElement('tr');

    let td_cant = document.createElement('td');
    td_cant.innerText = producto.cantidad;

    let td_producto = document.createElement('td');
    td_producto.innerText = producto.descript;

    let td_punitario = document.createElement('td');
    td_punitario.innerText = producto.p_unitario;

    let td_producto_id = document.createElement('td');
    td_producto_id.innerText = producto.product_id;
    td_producto_id.hidden = true;

    let td_modificador = document.createElement('td');
    td_modificador.innerText = producto.modification;
    td_modificador.hidden = true;

    let td_descripcion = document.createElement('td');
    let input_descrip = document.createElement('textarea');
    input_descrip.name = "p_descrip";
    input_descrip.style.width = "95%";

    td_descripcion.appendChild(input_descrip);

    tr.appendChild(td_cant);
    tr.appendChild(td_producto);
    tr.appendChild(td_punitario);
    tr.appendChild(td_producto_id);
    tr.appendChild(td_modificador);
    tr.appendChild(td_descripcion);

    return tr;
}

async function fillTableProductos() {
    let productos = await getListaProductos();
    //console.log('tamaño lista', productos.length);
    let tbody = $('#new-tbody-coti')[0];
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

    for (let i = 0, len = productos.length; i < len; i++) {
        //console.log('PRINT P', productos[i]);
        tbody.appendChild(createRowProducto(productos[i]));
    }
}

function readTableProductos() {
    let productos = [];
    //let trs = $("#new-tbody-coti").find("tbody > tr");
    //console.log('TRS', trs.prevObject[0].rows);

    $("#new-tbody-coti").find('textarea[name="p_descrip"]').each(function () {
        //console.log('TR', $(this).parents("tr")[0]);

        /*console.log($(this).parents("tr")[0].cells[0].innerText);
        console.log($(this).parents("tr")[0].cells[1].innerText);
        console.log($(this).parents("tr")[0].cells[2].innerText);
        console.log($(this).parents("tr")[0].cells[3].innerText);
        console.log($(this).parents("tr")[0].cells[4].innerText);
        console.log($(this).parents("tr").find('td > textarea[name="p_descrip"]').val());*/

        productos.push({
            cantidad: $(this).parents("tr")[0].cells[0].innerText,
            descript: $(this).parents("tr")[0].cells[1].innerText,
            p_unitario: $(this).parents("tr")[0].cells[2].innerText,
            product_id: $(this).parents("tr")[0].cells[3].innerText,
            modification: $(this).parents("tr")[0].cells[4].innerText,
            etiqueta: $(this).parents("tr").find('td > textarea[name="p_descrip"]').val()
        });
    });

    console.log('PRODUCTOS', productos);
    return productos;
}

/**
 * Validaciones a realizar antes de pasar a la lista de productos.
 */
function validacionesAprobadas() {
    if ($('#input-coti-asesor').val().trim() === '') {
        showNotification('info', 'Información', 'El campo de <b>Asesor</b> no puede estar vacío.');
        return false;
    }

    if ($('#input-coti-tag').val().trim() === '' && is_credit_client === true) {
        showNotification('info', 'Información', 'El campo de <b>TAG</b> es obligatorio para los clientes a crédito.');
        return false;
    }

    if (jQuery.isEmptyObject(data.order.products)) {
        showNotification('info', 'Información', 'La orden está vacía.');
        return false;
    }

    let dias = Math.abs($('#input-coti-dias').val());

    if (dias < 1) {
        showNotification('info', 'Información', 'El mínimo de días válidos es de al menos 1 día.');
        return false;
    }

    let condiciones = obtenerCondiciones();

    if (condiciones === "") {
        showNotification('info', 'Información', 'Debe proporcionar al menos un campo de <b>condición</b>.');
        return false;
    }

    return true;
}

async function generarCotizacion(productos_agrupados, productos_no_agrupados) {
    if ($('#input-coti-asesor').val().trim() === '') {
        showNotification('info', 'Información', 'El campo de <b>Asesor</b> no puede estar vacío.');
        return;
    }

    if ($('#input-coti-tag').val().trim() === '' && is_credit_client === true) {
        showNotification('info', 'Información', 'El campo de <b>TAG</b> es obligatorio para los clientes a crédito.');
        return;
    }

    if (jQuery.isEmptyObject(data.order.products)) {
        showNotification('info', 'Información', 'La orden está vacía.');
        return;
    }

    let dias = Math.abs($('#input-coti-dias').val());

    if (dias < 1) {
        showNotification('info', 'Información', 'El mínimo de días válidos es de al menos 1 día.');
        return;
    }

    let condiciones = obtenerCondiciones();

    if (condiciones === "") {
        showNotification('info', 'Información', 'Debe proporcionar al menos un campo de <b>condición</b>.');
        return;
    }

    showLoading();

    /* SE GENERA EL CUERPO DE LA COTIZACION */

    tag_asesor = $('#input-coti-tag').val().trim();

    let desglosado = $('#allow_desglose').prop('checked');

    let date = new Date().toLocaleString();
    date = date.split(' ');

    let fecha = date[0];
    let hora = date[1];

    let arr_fecha = fecha.split('/');

    fecha = getFormatoFecha(fecha);

    let sucursal = getSucursalName(Poster.settings.spotId);
    let nombre_cliente = getClientName();

    let folio = sucursal + "_" + arr_fecha[1] + "/" + arr_fecha[0] + "_" + nombre_cliente;

    let total = 0;

    let tbody = "";

    for (let grupo in productos_agrupados) {
        for (let i in productos_agrupados[grupo]['productos']) {
            let producto = productos_agrupados[grupo]['productos'][i];
            let price = parseFloat(producto.p_unitario);
            let cantidad = parseInt(producto.cantidad);
            total += cantidad * price;
        }
        tbody += createRowGroup_v2(grupo, productos_agrupados[grupo], desglosado);
    }

    /*for (let grupo in productos_agrupados) {
        if (desglosado) {
            for (let p in productos_agrupados[grupo]) {
                let producto = productos_agrupados[grupo][p]['producto'];
                let price = parseFloat(producto.p_unitario);
                let cantidad = parseInt(producto.cantidad);
                total += cantidad * price;
                tbody += createRow(producto, grupo);
            }
        } else {
            let subtotal_grupo = 0;
            for (let p in productos_agrupados[grupo]) {
                let producto = productos_agrupados[grupo]['productos'][p];
                let price = parseFloat(producto.p_unitario);
                let cantidad = parseInt(producto.cantidad);
                subtotal_grupo += cantidad * price;
            }
            total += subtotal_grupo;
            tbody += createRowGroup(productos_agrupados[grupo]['cant'], grupo, subtotal_grupo);
        }
    }*/

    for (let p in productos_no_agrupados) {
        let producto = productos_no_agrupados[p];
        let price = parseFloat(producto.p_unitario);
        let cantidad = parseInt(producto.cantidad);
        total += cantidad * price;
        tbody += createRow(producto);
    }

    if (cliente.discount !== 0) {
        let sub_total = total;
        total = total * ((100 - cliente.discount) / 100);

        tbody += '<tr>';
        tbody += '<td class="no-border-bottom" colspan="2"></td>';
        tbody += '<td>DESCUENTO:</td>';
        tbody += '<td class="center-text">' + cliente.discount + '%</td>';
        tbody += '</tr>';

        tbody += '<tr>';
        tbody += '<td class="no-border" colspan="2"></td>';
        tbody += '<td>SUBTOTAL:</td>';
        tbody += '<td class="center-text">$' + sub_total.toFixed(2) + '</td>';
        tbody += '</tr>';
    }

    tbody += '<tr>';
    tbody += '<td class="center-text no-border-top" colspan="2">' + tag_asesor + '</td>';
    tbody += '<td>TOTAL:</td>';
    tbody += '<td class="center-text">$' + total.toFixed(2) + '</td>';
    tbody += '</tr>';

    /* SE GUARDA INFORMACION DE LA COTIZACION EN BD */

    let datos = {
        sucursal_id: Poster.settings.spotId,
        fecha: fecha,
        hora: hora,
        folio: folio,
        client_id: cliente.id,
        client_name: nombre_cliente,
        asesor_id: asesor_id,
        asesor_name: $('#input-coti-asesor').val().trim(),
        productos_agrupados: JSON.stringify(productos_agrupados),
        productos_no_agrupados: productos_no_agrupados,
        total: total.toFixed(2),
        descuento: cliente.discount,
        dias: dias,
        condiciones: condiciones,
        tag: tag,
        tag_asesor: tag_asesor,
        observaciones: $('#input-coti-observa').val().trim()
    };

    console.log('datos a enviar al server', datos);

    await new Promise(resolve => {
        $.ajax({
            type: 'POST',
            url: 'url/Pos/guardar_cotizacion',
            data: datos,
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            console.log('DATA SERVER', data);
            if (data.status !== 0) {
                showNotification('error', 'Error', 'Status: ' + data.status + ', Mensaje: ' + data.message);
                return;
            }
            resolve();
        }).fail(function (xhr, textStatus, errorThrown) {
            console.error(xhr);
            showNotification('error', 'Error', xhr);
            return;
        });
    });

    await imprimirCotizacion(sucursal, fecha, folio, $('#input-coti-asesor').val().trim(), tbody, dias, condiciones);

    showNotification('success', 'Listo', '', true);
}

/**
 * Devuelve la fecha dada en el formato **yyyy-mm-dd**
 * @param {String} fecha 
 */
function getFormatoFecha(fecha) {
    let _fecha = fecha;
    _fecha = _fecha.split('/');

    if (parseInt(_fecha[0]) < 10) _fecha[0] = '0' + _fecha[0];
    if (parseInt(_fecha[1]) < 10) _fecha[1] = '0' + _fecha[1];

    _fecha = _fecha.reverse();
    _fecha = _fecha.join('-');

    return _fecha;
}

function getAliasName(alias_id) {
    return new Promise(resolve => {
        $.ajax({
            type: 'GET',
            url: 'url/Pos/get_alias_name',
            data: { 'alias_id': alias_id },
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            resolve(data);
        }).fail(function (xhr, textStatus, errorThrown) {
            resolve('No data');
        });
    });
}

/**
 * Obtiene del servidor la informacion de la cotizacion y reconstruye el documento.
 */
async function recuperarCotizacion(data) {
    showLoading();

    let cotizacion_id = data.id;
    let sucursal_id = data.sucursal_id;
    let fecha = data.fecha;
    let folio = data.folio;
    let asesor = data.asesor_name;
    let dias = data.dias;
    let condiciones = data.condiciones;
    let tag_asesor = data.tag_asesor;
    let descuento = data.descuento;

    if (dias === null) dias = 30;
    if (condiciones === null) condiciones = "<li>Precios sujetos a cambio sin previo aviso.</li><li>Los precios incluyen IVA.</li><li>50% Anticipo 50% Entrega.</li>";
    if (tag_asesor === null) tag_asesor = "";

    let tbody = "";

    await new Promise(resolve => {
        $.ajax({
            type: 'GET',
            url: 'url/Pos/get_products_coti',
            data: {
                cotizacion_id: cotizacion_id
            },
            dataType: 'json',
            encoded: true
        }).done(async function (data) {
            console.log(data);
            if (data.status !== 0) {
                showNotification('error', 'Un error ha ocurrido', 'Status: ' + data.status + '. Por favor, intente de nuevo.');
                return;
            } else {
                let productos_agrupados = {};
                let productos_no_agrupados = [];
                let total = 0;

                for (let i = 0, len = data.result.length; i < len; i++) {
                    let producto = data.result[i];
                    let alias_id = producto.alias_id;
                    if (alias_id) {
                        if (!(alias_id in productos_agrupados)) productos_agrupados[alias_id] = [];
                        productos_agrupados[alias_id].push(producto);
                    } else {
                        productos_no_agrupados.push(producto);
                    }
                }

                console.log('agrupados', productos_agrupados);
                console.log('no agrupados', productos_no_agrupados);

                let desglosado = await new Promise(resolve => {
                    swal({
                        title: "¿Imprimir cotización desglosada?",
                        text: "Esto no afecta a los datos almacenados en la cotización, por lo que si se equivoca puede reimprimirla nuevamente.",
                        icon: "info",
                        buttons: ["No", "Sí"],
                    }).then((value) => {
                        resolve(value);
                    });
                });

                for (let alias_id in productos_agrupados) {
                    let alias_obj = await getAliasName(alias_id);
                    console.log('ALIAS OBJ', alias_obj);
                    let temp_grupo = {};
                    temp_grupo['cant'] = alias_obj.result.cant;
                    temp_grupo['productos'] = productos_agrupados[alias_id];
                    for (let i in temp_grupo['productos']) {
                        let producto = temp_grupo['productos'][i];
                        let price = parseFloat(producto.p_unitario);
                        let cantidad = parseInt(producto.cantidad);
                        total += cantidad * price;
                    }
                    tbody += createRowGroup_v2(alias_obj.result.alias, temp_grupo, desglosado, true);
                }

                for (let p in productos_no_agrupados) {
                    let producto = productos_no_agrupados[p];
                    let price = parseFloat(producto.p_unitario);
                    let cantidad = parseInt(producto.cantidad);
                    total += cantidad * price;
                    tbody += createRow(producto, true);
                }

                /*for (let i = 0, len = data.result.length; i < len; i++) {
                    let cantidad = parseInt(data.result[i].cantidad);
                    let p_unitario = parseFloat(data.result[i].p_unitario);
                    let etiqueta = data.result[i].etiqueta ? data.result[i].etiqueta : "";

                    total += cantidad * p_unitario;

                    //TODO: reajustar al formato creando un objecto producto con la estructura correcta
                    tbody += createRow(cantidad, data.result[i].descrip, p_unitario, etiqueta);
                }*/

                if (descuento && descuento !== 0) {
                    let sub_total = total;
                    total = total * ((100 - descuento) / 100);

                    tbody += '<tr>';
                    tbody += '<td class="no-border-bottom" colspan="2"></td>';
                    tbody += '<td>DESCUENTO:</td>';
                    tbody += '<td class="center-text">' + descuento + '%</td>';
                    tbody += '</tr>';

                    tbody += '<tr>';
                    tbody += '<td class="no-border" colspan="2"></td>';
                    tbody += '<td>SUBTOTAL:</td>';
                    tbody += '<td class="center-text">$' + sub_total.toFixed(2) + '</td>';
                    tbody += '</tr>';
                }

                tbody += '<tr>';
                tbody += '<td class="center-text no-border-top" colspan="2">' + tag_asesor + '</td>';
                tbody += '<td>TOTAL:</td>';
                tbody += '<td class="center-text">$' + total.toFixed(2) + '</td>';
                tbody += '</tr>';

                resolve();
            }
        }).fail(function (xhr, textStatus, errorThrown) {
            showNotification('error', 'Error', xhr);
            return;
        });
    });

    await imprimirCotizacion(getSucursalName(sucursal_id), fecha, cotizacion_id + "_" + folio, asesor, tbody, dias, condiciones);

    Swal.close();
}

function imprimirCotizacion(sucursal, fecha, folio, asesor, tbody, dias, condiciones) {
    return new Promise(async resolve => {
        let img64 = "data:image/png;base64,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";

        let _html = template_html;

        _html = _html.replace('#sucursal#', sucursal);
        _html = _html.replace('#fecha#', getFechaExtendida(fecha));
        _html = _html.replace('#folio#', folio);
        _html = _html.replace('#asesor#', asesor);
        _html = _html.replace('#img#', img64);
        _html = _html.replace('#tbody#', tbody);
        _html = _html.replace('#dias#', dias);
        _html = _html.replace('#condiciones#', condiciones);

        let iframe = document.createElement('iframe');
        iframe.name = 'iframe';
        iframe.style.position = "absolute";
        iframe.style.top = "-5000px";
        document.body.appendChild(iframe);
        let frameDoc = (iframe.contentWindow) ? iframe.contentWindow : (iframe.contentDocument.document) ? iframe.contentDocument.document : iframe.contentDocument;
        frameDoc.document.open();
        frameDoc.document.write(_html);
        frameDoc.document.close();

        await new Promise(resolve => {
            setTimeout(() => {
                /*
                let doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [8.5 * 130, 11 * 130]
                });

                let _iframe = window.frames['iframe'];
                let _body = _iframe.document.getElementsByTagName("body")[0];
                */

                //console.log(_iframe.document.documentElement);
                /*
                console.log('IMPRIMIENDO HTML PARSEADO');
                console.log(jQuery.parseHTML(_html));

                doc.fromHTML(_html, 1, 1, {}, () => {
                    doc.save('a4.pdf');
                    //document.body.removeChild(iframe);
                    resolve();
                });
                */

                window.frames['iframe'].focus();
                window.frames['iframe'].print();
                document.body.removeChild(iframe);
                resolve();
            }, 500);
        });

        resolve();
    });
}

/**
 * Devuelve una fila con la informacion de **un producto** en el formato para la tabla de cotizacion.
 * @param {*} producto 
 * @param {Boolean} recovery 
 */
function createRow(producto, recovery = false) {
    let row = '';

    let cantidad = parseInt(producto.cantidad);
    let p_unitario = parseFloat(producto.p_unitario);
    let etiqueta = producto.etiqueta ? producto.etiqueta : "";

    row += '<tr>';
    row += '<td class="center-text">' + cantidad + '</td>';
    row += '<td class="td-gray etiqueta">' + (recovery ? producto.descrip : producto.descript) + '<br/><i><b>' + etiqueta + '</b></i></td>';
    row += '<td class="td-gray etiqueta center-text top-text">$' + p_unitario.toFixed(2) + '</td>';
    row += '<td class="td-gray etiqueta center-text top-text">$' + (cantidad * p_unitario).toFixed(2) + '</td>';
    row += '</tr>';

    return row;
}

/**
 * Devuelve una fila con la informacion de **un grupo de productos** en el formato para la tabla de cotizacion.
 * @param {String} alias El alias o nombre del grupo.
 * @param {Number} subtotal El subtotal correspondiente del grupo.
 */
function createRowGroup(cantidad, alias, subtotal) {
    let row = '';

    row += '<tr>';
    row += '<td rowspan="1" class="center-text">' + cantidad + '</td>';
    row += '<td class="td-gray">' + alias + '</td>';
    row += '<td class="td-gray center-text">$' + (subtotal / cantidad).toFixed(2) + '</td>';
    row += '<td class="td-gray center-text">$' + subtotal + '</td>';
    row += '</tr>';

    return row;
}

/**
 * Devuelve una fila con la informacion de **un grupo de productos** en el formato para la tabla de cotizacion.
 * @param {String} alias 
 * @param {*} grupo 
 * @param {Boolean} desglosado 
 * @param {Boolean} recovery 
 */
function createRowGroup_v2(alias, grupo, desglosado, recovery = false) {
    let row = '', row_desglose = '';
    let cantidad = parseInt(grupo['cant']);
    let subtotal = 0;
    let rowspan = 1;

    for (let i in grupo['productos']) {
        let producto = grupo['productos'][i];
        let p_cantidad = parseInt(producto.cantidad);
        let p_subtotal = p_cantidad * parseFloat(producto.p_unitario);
        let descripcion = recovery ? producto.descrip : producto.descript;
        let etiqueta = producto.etiqueta ? producto.etiqueta : "";

        row_desglose += '<tr>';
        row_desglose += '<td class="etiqueta no-border">' + p_cantidad + ' - ' + descripcion + '<br/><i><b>' + etiqueta + '</b></i></td>';
        row_desglose += '<td class="etiqueta center-text top-text no-border">' + producto.p_unitario + '</td>';
        row_desglose += '<td class="etiqueta center-text top-text no-border">' + p_subtotal.toFixed(2) + '</td>';
        row_desglose += '</tr>';

        subtotal += p_subtotal;
    }

    if (desglosado) rowspan = grupo['productos'].length + 1;

    row += '<tr>';
    row += '<td rowspan="' + rowspan + '" class="center-text top-text">' + grupo['cant'] + '</td>';
    row += '<td class="td-gray">' + alias + '</td>';
    row += '<td class="td-gray center-text">$' + (subtotal / cantidad).toFixed(2) + '</td>';
    row += '<td class="td-gray center-text">$' + subtotal.toFixed(2) + '</td>';
    row += '</tr>';

    if (desglosado) row += row_desglose;

    return row;
}

/**
 * Devuelve el nombre de la sucursal a traves de su ID.
 * @param {String | Number} id El ID de la sucursal.
 */
function getSucursalName(id) {
    let spot_id = parseInt(id);
    let sucursal = "";

    switch (spot_id) {
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
            sucursal = "Sucursal (" + spot_id + ")";
    }

    return sucursal;
}

/**
 * Devuelve el nombre completo del cliente.
 */
function getClientName() {
    let last_name = cliente.lastname ? cliente.lastname : "";
    let first_name = cliente.firstname ? cliente.firstname : "";
    let patronymic = cliente.patronymic ? cliente.patronymic : "";

    return last_name + " " + first_name + " " + patronymic;
}

/**
 * Devuelve la fecha como una sentencia extendida.
 * @param {String} fecha La fecha en formato **dd/mm/yyyy**
 */
function getFechaExtendida(fecha) {
    //let arr_fecha = fecha.split('/');
    let arr_fecha = fecha.split('-');
    let meses = {
        1: 'Enero',
        2: 'Febrero',
        3: 'Marzo',
        4: 'Abril',
        5: 'Mayo',
        6: 'Junio',
        7: 'Julio',
        8: 'Agosto',
        9: 'Septiembre',
        10: 'Octubre',
        11: 'Noviembre',
        12: 'Diciembre'
    };
    return arr_fecha[2] + " de " + meses[parseInt(arr_fecha[1])] + " del " + arr_fecha[0];
}

/**
 * Obtiene la información del asesor activo.
 */
async function getAsesor() {
    await new Promise(resolve => {
        Poster.users.getActiveUser().then((user) => {
            if (!user) {
                asesor_name = "***"
                asesor_id = 8;
                return;
            }

            console.log(user);
            asesor_name = user.name;
            asesor_id = user.id;
            resolve();
        });
    });
}

/**
 * Obtiene la información del cliente.
 */
async function getClient() {
    await new Promise(resolve => {
        is_credit_client = false;
        Poster.clients.get(data.order.clientId).then((client) => {
            if (!client) {
                return;
            }
            console.log('datos del cliente: ', client);
            if (client.groupId === parseInt(localStorage.getItem('credit_group_id'))) is_credit_client = true;
            cliente = client;
            resolve();
        });
    });
}

/**
 * Genera un input para una nueva condicion
 */
function addNewFieldCoti() {
    let coti_condiciones = $('#cotizacion-condiciones')[0];

    let newInputText = document.createElement('input');
    newInputText.type = "text";
    newInputText.className = "form-control coti-condicion";

    coti_condiciones.appendChild(newInputText);
}

/**
 * Regresa un string con la lista de todas las condiciones proporcionadas
 */
function obtenerCondiciones() {
    let condiciones = "";

    $('#cotizacion-condiciones').find('input[type="text"]').each(function () {
        console.log($(this).val());
        if ($(this).val().trim() !== "") {
            condiciones += "<li>" + $(this).val().trim() + "</li>";
        }
    });

    return condiciones;
}

async function generarTagCoti() {
    tag = "";
    let array_products = [];

    for (let i in data.order.products) {
        array_products.push(data.order.products[i].id);
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

    //$('#input-coti-tag').val(tag);
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

// TODO: optimizar para que regreses a la ventana anterior y no al inicio de golpe
function regresar() {
    $('#cotizacion-main').show();
    $('#cotizacion-nueva').hide();
    $('#cotizacion-productos').hide();
    $('#cotizacion-grupos').hide();
    $('#cotizacion-buscar').hide();
    $('#cotizacion-regresar').hide();
}

function hideViews() {
    $('#cotizacion-main, #cotizacion-nueva, #cotizacion-productos,\
    #cotizacion-grupos, #cotizacion-buscar, #cotizacion-regresar').hide();
}

function showLoading() {
    Swal.fire({
        title: 'Procesando...',
        allowOutsideClick: false,
        timer: 1000,
        onBeforeOpen: () => {
            Swal.showLoading();
            Swal.stopTimer();
        }
    });
}

function mostrarVista(opcion) {
    hideViews();
    switch (opcion) {
        case 1: // Ventana nueva cotizacion
            $('#cotizacion-nueva, #cotizacion-regresar').show();
            //$('#cotizacion-buscar, #cotizacion-main, #cotizacion-grupos').hide();
            $('#input-coti-asesor').val(asesor_name);
            break;
        case 2: // Ventana buscar cotizacion
            $('#cotizacion-buscar, #cotizacion-regresar').show();
            //$('#cotizacion-nueva, #cotizacion-main, #cotizacion-grupos').hide();
            $('#h3-coti-cliente').text(getClientName());
            let date = new Date();
            $('#coti-fecha-inicio')[0].valueAsDate = date;
            $('#coti-fecha-fin')[0].valueAsDate = date;
            obtenerCotizaciones();
            break;
        case 3: // Ventana lista de productos
            if (!validacionesAprobadas()) {
                $('#cotizacion-nueva').show();
                return;
            };
            //$('#cotizacion-nueva, #cotizacion-buscar, #cotizacion-main, #cotizacion-grupos').hide();
            $('#cotizacion-productos, #cotizacion-regresar').show();
            fillTableProductos();
            break;
        case 4: // Ventana editor de grupos
            //$('#cotizacion-nueva, #cotizacion-buscar, #cotizacion-main, #cotizacion-productos').hide();
            let _productos = readTableProductos();
            editorDragula = <EditorDragula productos={_productos} callback={generarCotizacion} is_venta={false} />;
            $('#cotizacion-grupos, #cotizacion-regresar').show();
            this.setState();
            break;
    }
}

function test_bind(datos_agrupados, datos_no_agrupados) {
    console.log('bind exitoso');
    console.log(datos_agrupados);
    console.log(datos_no_agrupados);
}

export default class Cotizacion extends React.Component {
    constructor(props) {
        super(props);
        mostrarVista = mostrarVista.bind(this);
        /*Poster.on('afterPopupClosed', () => {
            location.reload();
        });*/
    }

    render() {
        data = this.props.data;
        if (data.order.clientId === 0) return (<ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />);
        generarTagCoti();
        getAsesor();
        getClient();

        return (
            <div>
                <div id="cotizacion-regresar" hidden>
                    <button id="btn-coti-regresar" className="btn btn-info" onClick={regresar}>Regresar</button>
                </div>
                <div id="cotizacion-main">
                    <button className="btns btn btn-default" onClick={() => { mostrarVista(1) }}>Nueva Cotización</button>
                    <button className="btns btn btn-default" onClick={() => { mostrarVista(2) }}>Buscar Cotización</button>
                </div>
                <div id="cotizacion-nueva" hidden>
                    <div className="input-group">
                        <span className="input-group-addon">👤 Asesor:</span>
                        <input type="text" id="input-coti-asesor" className="form-control input-pi" defaultValue={asesor_name} />
                    </div>
                    <div className="input-group">
                        <span className="input-group-addon">⏳ Días válidos para la cotización:</span>
                        <input type="number" id="input-coti-dias" min={1} className="form-control input-pi" defaultValue={30} />
                    </div>


                    <div className="input-group">
                        <span className="input-group-addon">📃 TAG</span>
                        <input type="text" id="input-coti-tag" className="form-control input-pi" />
                    </div>
                    <div className="input-group">
                        <span className="input-group-addon">📃 Observaciones</span>
                        <input type="text" id="input-coti-observa" className="form-control input-pi" />
                    </div>
                    <div className="alert alert-info" role="alert">
                        <p>
                            <b>Recuerda: </b>El TAG debe ser una descripción sencilla que sirve para identificar fácilmente una venta o cotización.
                        </p>
                        <p>
                            El TAG es <b>OBLIGATORIO</b> para los clientes a crédito.
                        </p>
                    </div>
                    <h3>Condiciones:</h3>
                    <div id="cotizacion-condiciones">
                        <input type="text" className="form-control coti-condicion" defaultValue={"Precios sujetos a cambio sin previo aviso."} />
                        <input type="text" className="form-control coti-condicion" defaultValue={"Los precios incluyen IVA."} />
                        <input type="text" className="form-control coti-condicion" defaultValue={"50% Anticipo 50% Entrega."} />
                    </div>
                    <button className="btns btn btn-default" onClick={addNewFieldCoti}>Añadir condición</button>
                    <button className="btns btn btn-success" onClick={() => { mostrarVista(3) }}>Siguiente</button>
                </div>
                <div id="cotizacion-productos" hidden>
                    <h1>Lista de productos</h1>
                    <div className="scrollable-coti-prods">
                        <table>
                            <thead>
                                <th>Cantidad</th>
                                <th style={{ "width": "45%" }}>Producto</th>
                                <th>P. Unitario</th>
                                <th hidden>P. Id</th>
                                <th hidden>Modificador</th>
                                <th>Descripción</th>
                            </thead>
                            <tbody id="new-tbody-coti"></tbody>
                        </table>
                    </div>
                    <br />
                    <button className="btns btn btn-success" onClick={() => { mostrarVista(4) }}>Siguiente</button>
                </div>
                <div id="cotizacion-grupos" hidden>
                    {editorDragula}
                </div>
                <div id="cotizacion-buscar" hidden>
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-sm-2">
                                <h3 id="h3-coti-cliente"></h3>
                            </div>
                            <div className="col-sm-7" id="coti-div-fechas">
                                <p>Inicio:</p>
                                <input className="form-control" type="date" id="coti-fecha-inicio" />
                                <p>Fin:</p>
                                <input className="form-control" type="date" id="coti-fecha-fin" />
                            </div>
                            <div className="col-sm-2">
                                <button className="btn btn-primary" onClick={obtenerCotizaciones}>Aplicar</button>
                            </div>
                        </div>
                        <div className="row scrollable-coti">
                            <table>
                                <thead>
                                    <th>ID</th>
                                    <th>Sucursal</th>
                                    <th>Total</th>
                                    <th>Fecha</th>
                                    <th>Hora</th>
                                    <th>Folio</th>
                                    <th>Asesor</th>
                                    <th>TAGS</th>
                                    <th>⚙️</th>
                                </thead>
                                <tbody id="coti-tbody"></tbody>
                            </table>
                        </div>
                        <div id="coti-div-loader" className="row" hidden>
                            <div>
                                <div className="lds-facebook"><div></div><div></div><div></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>);
    }
}