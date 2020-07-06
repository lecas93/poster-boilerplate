import dragula from 'dragula/dragula';
import 'dragula/dist/dragula.css';
import template_panel from "../cotizacion/templates/alias-panel.html";
import template_drag_producto from "../cotizacion/templates/drag-producto.html";
import Swal from 'sweetalert2';
import { showNotification_v1 } from "../util/notifications";

let callback = null;
let is_venta = false;
let drake = null;
let panel_count = 0;
let productos = null;

/** TO DO:
 * construir nuevo objecto con las estructuras generadas
 * ajustar BD y guardar las nuevas estructuras
 * recuperar y reconstruir las cotizaciones con las nuevas estructuras
 */

function initDragula() {
    drake = dragula({
        revertOnSpill: true,
        accepts: function (el, target, source, sibling) {
            return !$(el).hasClass('subtotal');
        }
    });

    /*
    drake.on('drop', (element, target, source, sibling) => {
        console.log('element', element);
        let precio = $(element).find('td[id="precio"]');
        console.log('precio', precio.text().replace('$', ''));
        console.log('container', target);
        console.log('source', source);
        //calcularSubTotal(target);
        //calcularSubTotal(source);
    });
    */

    drake.containers.push($('#contenedor-izq')[0]);
}

// TODO: borrar despues
function calcularSubTotal(element) {
    let subtotal = 0;
    $(element).find('td[id="precio"]').each(function () {
        console.log('elementos encontrados');
        console.log($(this).text());
        subtotal += parseFloat($(this).text().replace('$', ''));
    });

    $(element).find('p[id="panel-subtotal"]').text('Sub-total: $' + subtotal.toFixed(2));
}

//TODO: borrar despues
function crearProductosTest() {
    productos = []
    for (let i = 0; i < 5; i++) {
        productos.push({
            cantidad: 1,
            descript: 'Producto ' + i,
            p_unitario: 100 + i,
            product_id: 600 + i,
            modification: 'test-mod-' + i,
            etiqueta: 'etiqueta-' + i
        });
    }
}

function addDragProductos() {
    let contenedor = $('#contenedor-izq');
    let contenedor_der = $('#contenedor-der');
    while (contenedor[0].firstChild) contenedor[0].removeChild(contenedor[0].firstChild);
    while (contenedor_der[0].firstChild) contenedor_der[0].removeChild(contenedor_der[0].firstChild);

    let current_panel_id = "";

    for (let p in productos) {
        let new_drag_producto = template_drag_producto;

        new_drag_producto = new_drag_producto.replace('#cantidad#', productos[p].cantidad);
        new_drag_producto = new_drag_producto.replace('#descript#', productos[p].descript);
        new_drag_producto = new_drag_producto.replace('#p_unitario#', productos[p].p_unitario);
        new_drag_producto = new_drag_producto.replace('#product_id#', productos[p].product_id);
        new_drag_producto = new_drag_producto.replace('#modification#', productos[p].modification);
        new_drag_producto = new_drag_producto.replace('#etiqueta#', productos[p].etiqueta);
        new_drag_producto = jQuery.parseHTML(new_drag_producto);

        if (is_venta) {
            let prod_name = productos[p].descript;
            if (prod_name.startsWith('_')) {
                // crear panel con el nombre del separador
                current_panel_id = addPanel(prod_name);
            } else {
                // añadir producto al ultimo panel creado
                if (current_panel_id !== '') {
                    let specific_container = $('#panel-' + current_panel_id);
                    specific_container.append(new_drag_producto);
                } else {
                    contenedor.append(new_drag_producto);
                }
                drake.containers.push(new_drag_producto);
            }
        } else {
            contenedor.append(new_drag_producto);
            drake.containers.push(new_drag_producto);
        }
    }
}

function addPanel(default_alias = null) {
    let id = panel_count;
    let contenedor = $('#contenedor-der');

    let new_panel = template_panel;
    new_panel = new_panel.replace(/{{num}}/g, id);

    if (default_alias) {
        new_panel = new_panel.replace('{{default_value}}', ' value="' + default_alias + '" ');
    } else {
        new_panel = new_panel.replace('{{default_value}}', '');
    }
    new_panel = jQuery.parseHTML(new_panel);

    contenedor.prepend(new_panel);
    $('#alias-btn-' + id).on('click', function () {
        removePanel(id);
    });

    drake.containers.push($('#panel-' + id)[0]);
    panel_count++;

    return id;
}

function removePanel(id) {
    Swal.fire({
        title: '¿Eliminar grupo?',
        type: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No',
        allowOutsideClick: false
    }).then((result) => {
        if (result.value) {
            $('#alias-panel-' + id).find('div[class="well well-sm"]').each(function () {
                $('#contenedor-izq').append($(this));
            });
            $('#alias-panel-' + id).remove();
        }
    });
}

function generarDatos() {
    let no_errors = true;
    let datos_agrupados = {};
    let datos_no_agrupados = [];

    // Leemos datos del contenedor derecho. Productos agrupados
    $('#contenedor-der').find('div[class="panel panel-default"]').each(function () {
        let cantidad = 0;
        $(this).find('input[id="input-cant"]').each(function () {
            cantidad = parseInt($(this).val());
            console.log('cant', cantidad);
        });

        if (isNaN(cantidad) || cantidad <= 0) {
            no_errors = false;
            showNotification_v1('info', 'Cantidad no proporcionada', 'Debe proporcionar una cantidad mayor a cero.');
            return;
        }

        // Obtenemos el nombre del grupo
        let alias = "";
        $(this).find('input[id="input-alias"]').each(function () {
            alias = $(this).val().trim();
            console.log('alias', alias);
        });

        if (alias in datos_agrupados) {
            no_errors = false;
            showNotification_v1('info', 'Alias repetido', 'El alias ya está siendo utilizado por otro grupo.');
            return;
        }

        if (!alias) {
            no_errors = false;
            showNotification_v1('info', 'Grupo sin alias', 'No puede dejar el alias en blanco.');
            return;
        }

        datos_agrupados[alias] = {};
        datos_agrupados[alias]['cant'] = cantidad;
        datos_agrupados[alias]['productos'] = [];

        // Obtenemos la lista de productos
        console.log('imprimiendo datos del producto');
        $(this).find('tr[name="row_data"]').each(function () {
            /*console.log('cantidad', $(this)[0].cells[0].innerText);
            console.log('descript', $(this)[0].cells[1].innerText);
            console.log('p_unitario', $(this)[0].cells[2].innerText);
            console.log('product_id', $(this)[0].cells[3].innerText);
            console.log('modification', $(this)[0].cells[4].innerText);
            console.log('etiqueta', $(this)[0].cells[5].innerText);*/

            datos_agrupados[alias]['productos'].push({
                cantidad: $(this)[0].cells[0].innerText,
                descript: $(this)[0].cells[1].innerText,
                p_unitario: $(this)[0].cells[2].innerText,
                product_id: $(this)[0].cells[3].innerText,
                modification: $(this)[0].cells[4].innerText,
                etiqueta: $(this)[0].cells[5].innerText
            });
        });

        if (datos_agrupados[alias]['productos'].length === 0) {
            no_errors = false;
            showNotification_v1('info', 'Grupo vacío', 'No puede dejar grupos vacíos.');
            return;
        }
    });

    // Leemos datos del contenedor izquierdo. Productos no agrupados
    $('#contenedor-izq').find('tr[name="row_data"]').each(function () {
        /*console.log('cantidad', $(this)[0].cells[0].innerText);
        console.log('descript', $(this)[0].cells[1].innerText);
        console.log('p_unitario', $(this)[0].cells[2].innerText);
        console.log('product_id', $(this)[0].cells[3].innerText);
        console.log('modification', $(this)[0].cells[4].innerText);
        console.log('etiqueta', $(this)[0].cells[5].innerText);*/

        datos_no_agrupados.push({
            cantidad: $(this)[0].cells[0].innerText,
            descript: $(this)[0].cells[1].innerText,
            p_unitario: $(this)[0].cells[2].innerText,
            product_id: $(this)[0].cells[3].innerText,
            modification: $(this)[0].cells[4].innerText,
            etiqueta: $(this)[0].cells[5].innerText
        });
    });

    if (no_errors) {
        //console.log('datos agrupados', datos_agrupados);
        //console.log('datos no agrupados', datos_no_agrupados);
        callback(datos_agrupados, datos_no_agrupados);
    }
}

export default class EditorDragula extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        //dragula([$('#izquierda2')[0], $('#derecha2')[0]], { revertOnSpill: true });
        initDragula();
        //drake.containers.push($('#derecha2')[0]);
        //drake.containers.push($('#panel1')[0]);
        //drake.containers.push($('#panel2')[0]);
        //crearProductosTest(); // TODO: para test y debug, borrar despues
        addDragProductos();
    }

    render() {
        productos = this.props.productos;
        callback = this.props.callback;
        is_venta = this.props.is_venta;
        let texto = "Generar cotización";
        if (is_venta) texto = "Siguiente";
        panel_count = 0;
        if (drake) {
            addDragProductos();
        }
        return (
            <div>
                <div className="container-fluid">
                    <div className="row">
                        <button className="btn btn-primary" style={{ marginBottom: '10px' }} onClick={() => { addPanel() }}>Nuevo grupo</button>
                    </div>
                    <div className="row">
                        <div id="contenedor-izq" className="col-sm-6 panel panel-default panel-body scrollable-coti-drag"></div>
                        <div id="contenedor-der" className="col-sm-6 panel panel-default panel-body scrollable-coti-drag"></div>
                    </div>
                    <div id="div-desglosado" className="row" style={{ display: 'inline-flex', fontSize: '13pt' }}>
                        <label className="form-check-label" for="allow_desglose">¿Desglosado?</label>
                        <input className="form-check-input" style={{ marginLeft: '5px', transform: 'scale(1.5)' }} type="checkbox" id="allow_desglose" name="allow_desglose" />
                    </div>
                    <div className="row">
                        <button className="btn btn-lg btn-success" onClick={generarDatos}>{texto}</button>
                    </div>
                </div>
            </div>
        );
    }
}