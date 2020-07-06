import './style.css';
import './select2.min.css'
import Swal from 'sweetalert2';

import { showNotification, showNotification_v1 } from '../util/notifications';

let fecha;
let solicitante;
let sucursal;

let ingredientes;
let empleados;

let productos = []; // productos para manejo de tabla
let productosFinal = []; // lista final de productos a enviar a BD

function setSelect2() { // se llama en el constructor del componente
    /*
    (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) { return; }
        js = d.createElement(s); js.id = id;
        js.onload = function () {
            (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) { return; }
                js = d.createElement(s); js.id = id;
                js.onload = function () {
                    $(".select2").select2();
                };
                js.src = "https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.5/js/select2.full.min.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'select2'));
        };
        js.src = "https://code.jquery.com/jquery-1.7.1.min.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'JQuery'));
    */
    (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        //if (d.getElementById(id)) { return; }
        js = d.createElement(s); js.id = id;
        js.onload = function () {
            $(".select2").select2();
        };
        js.src = "https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.5/js/select2.full.min.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'select2'));

}

/**
 * Obtiene el nombre del asesor.
 */
function getSolicitante() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            return;
        }
        solicitante = user.name;
    });
}

/**
 * Obtiene el nombre de la sucursal.
 */
function getSucursal() {
    Poster.makeApiRequest('access.getSpots', {
        method: 'get'
    }, (result) => {
        if (result) {
            //console.log("spots: ", result);
            result.forEach((item) => {
                if (Poster.settings.spotId === Number(item.spot_id)) {
                    sucursal = item.spot_name;
                    return;
                }
            });
        }
    });
}

/**
 * Obtiene todos los productos (ingredients en Poster) para hacer las requisiciones.
 */
function getIngredientes() {
    Poster.makeApiRequest('menu.getIngredients', {
        method: 'get'
    }, (result) => {
        if (result) {
            console.log("ingredientes: ", result);
            ingredientes = result;
            fillSelectIngredients(result);
        }
    });
}

/**
 * Obtiene la lista de empleados.
 */
function getEmpleados() {
    Poster.makeApiRequest('access.getEmployees', {
        method: 'get'
    }, (employees) => {
        empleados = employees;
        console.log(empleados[0]);
    });
}

/**
 * Añade los productos al SELECT
 * @param {Array} data El arreglo con los datos de los productos.
 */
function fillSelectIngredients(data) {
    let select = $('#selectIngredients').get(0);
    while (select.firstChild) select.removeChild(select.firstChild);
    let length = data.length;
    for (let i = 0; i < length; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = data[i].ingredient_name;
        select.appendChild(opt);
    }
    cargarInsumosSugeridos();
    enableButtons();
}

/**
 * Agrega una fila con la información del producto seleccionado a la tabla.
 */
function addIngredient() {
    let producto = $('select[id=selectIngredients] option:selected').text();
    let uniMedida = ingredientes[$('select[id=selectIngredients] option:selected').val()].ingredient_unit;
    let marcaSugerida = "";

    let length = productos.length;
    for (let i = 0; i < length; i++) {
        if (productos[i][0] === producto) return; // Evitamos que se repita un producto
    }

    productos.push([producto]);
    console.log("productos en la tabla: ", productos);

    let markup = "<tr><td><input type='checkbox' name='record'></td><td style='display:none;'><input type='number' name='productID' value='" + ingredientes[$('select[id=selectIngredients] option:selected').val()].ingredient_id + "' ></td><td>" + producto + "</td><td>" + "<input type='number' class='inputCant' name='cantidad' value='1'>" + "</td><td>" + uniMedida + "</td><td contenteditable='true'>" + marcaSugerida + "</td></tr>";

    $("table[id='table-req'] tbody").prepend(markup);
}

/**
 * Elimina todos las filas seleccionadas en la tabla de productos.
 */
function deleteIngredient() {
    $("table[id='table-req'] tbody").find('input[name="record"]').each(function () {
        //console.log("celda: ", $(this).parents("tr"));

        if ($(this).is(":checked")) {

            // buscamos y eliminamos el producto en el array
            let producto = $(this).parents("tr")[0].cells[2].innerText;
            let length = productos.length;
            for (let i = 0; i < length; i++) {
                if (productos[i][0] === producto) {
                    console.log("producto eliminado: ", producto);
                    productos.splice(i, 1);
                    break;
                }
            }

            $(this).parents("tr").remove();
        }
    });
    console.log("productos: ", productos);
}

function cargarInsumosSugeridos() {
    console.log('ingredientes', ingredientes);
    $.ajax({
        type: 'GET',
        url: 'url/Requisiciones/get_insumos_sugeridos',
        data: {
            id_sucursal: Poster.settings.spotId
        },
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log('Insumos sugeridos', data);
        if (data.result.length > 0) {
            for (let i = 0, len = data.result.length; i < len; i++) {
                console.log('procesando insumo sugerido...');
                let id_insumo = parseInt(data.result[i].id_insumo);
                let stock_min = parseInt(data.result[i].stock_min);
                let stock_max = parseInt(data.result[i].stock_max);
                let stock_actual = parseInt(data.result[i].stock_actual);
                let stock_faltante = stock_max - stock_actual;

                let ingredient = ingredientes.filter(function (_ingredient) {
                    return _ingredient.ingredient_id === id_insumo;
                });
                ingredient = ingredient[0];

                let insumo = ingredient.ingredient_name;
                let uniMedida = ingredient.ingredient_unit;
                let marcaSugerida = "";

                productos.push([insumo]);
                console.log("productos en la tabla: ", productos);

                let markup = "<tr>";
                markup += "<td><input type='checkbox' name='record'></td>";
                markup += "<td style='display:none;'><input type='number' name='productID' value='" + id_insumo + "' ></td>";
                markup += "<td>" + insumo + "</td>";
                markup += "<td><input type='number' class='inputCant' name='cantidad' value='" + stock_faltante + "'></td>";
                markup += "<td>" + uniMedida + "</td>";
                markup += "<td contenteditable='true'>" + marcaSugerida + "</td>";
                markup += "</tr>";

                $("table[id='table-req'] tbody").prepend(markup);
            }
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr);
    });

    /*let producto = $('select[id=selectIngredients] option:selected').text();
    let uniMedida = ingredientes[$('select[id=selectIngredients] option:selected').val()].ingredient_unit;
    let marcaSugerida = "";

    let length = productos.length;
    for (let i = 0; i < length; i++) {
        if (productos[i][0] === producto) return; // Evitamos que se repita un producto
    }

    productos.push([producto]);
    console.log("productos en la tabla: ", productos);

    let markup = "<tr><td><input type='checkbox' name='record'></td><td style='display:none;'><input type='number' name='productID' value='" + ingredientes[$('select[id=selectIngredients] option:selected').val()].ingredient_id + "' ></td><td>" + producto + "</td><td>" + "<input type='number' class='inputCant' name='cantidad' value='1'>" + "</td><td>" + uniMedida + "</td><td contenteditable='true'>" + marcaSugerida + "</td></tr>";

    $("table[id='table-req'] tbody").prepend(markup);*/
}

/**
 * Envia la requisición al servidor y le asigna un status.
 */
function enviarRequisicion() {
    /*
    let i, n, employee, role;
    for (i = 0, n = empleados.length; i < n; i++) {
        employee = empleados[i];
        if (employee.name == solicitante) {
            role = employee.role_id;
            if (role == 5 || role == 6) {
                realizarEnvio(0);
            } else {
                realizarEnvio(-1);
            }
            break;
        }
    }
    */
    realizarEnvio(Number(localStorage.getItem('auth')));
}

/**
 * Envia la requisición al servidor para almacenarla.
 * @param {Number} status 0: Autorizada | -1: Pendiente de autorización.
 */
function realizarEnvio(status) {
    // creamos el array final de productos a enviar a la BD
    let productID;
    let product;
    let cant;
    let uniMed;
    let marcaSug;
    productosFinal = [];
    $("table[id='table-req'] tbody").find('input[name="record"]').each(function () {
        productID = $(this).parents("tr").find('input[name="productID"]').val();
        product = $(this).parents("tr")[0].cells[2].innerText;
        cant = $(this).parents("tr").find('input[name="cantidad"]').val();
        uniMed = $(this).parents("tr")[0].cells[4].innerText;
        marcaSug = $(this).parents("tr")[0].cells[5].innerText;

        product = product.replace(/"/g, ' pulg.');

        //productosFinal.push([productID, product, cant, uniMed, marcaSug, false]);
        productosFinal.push({
            product_id: productID,
            product: product,
            cant: cant,
            uniMed: uniMed,
            marcaSug: marcaSug,
            suministrado: 0
        });
    });

    //console.log("productos a enviar: ", productosFinal);
    //return;
    if (productosFinal.length !== 0) {
        disableButtons();

        let observaciones = $('#observaciones').val();
        observaciones = observaciones.replace(/\n/g, '<br />');

        $.ajax({
            url: 'url/Requisiciones/register_requisicion',
            data: {
                fecha: fecha,
                solicitante: solicitante,
                sucursal: Poster.settings.spotId,
                productos: productosFinal,
                observaciones: observaciones,
                status: status
            },
            type: 'POST',
            success: function (response) {
                console.log('response:', response);
                clearTable();
                showNotification('success', '¡Éxito!', '¡Requisición enviada con éxito!');
                localStorage.setItem('requisicion', '');
                productosFinal = [];
            },
            error: function (e) {
                console.log('error:', e);
                showNotification('error', 'Ha ocurrido un error', 'Por favor, intente de nuevo.');
                productosFinal = [];
            },
            complete: function () {
                enableButtons();
                productosFinal = [];
            }
        });
    } else {
        showNotification_v1('info', 'Aviso', 'No puede enviar requisiciones sin productos');
    }
}

/**
 * Despliega un modal para confirmar la acción de vaciar la tabla de productos.
 */
function vaciarTabla() {
    if (productos.length !== 0) {
        Swal.fire({
            title: '¿Vaciar la tabla?',
            text: "Este cambio NO podrá ser revertido",
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, estoy seguro',
            cancelButtonText: 'No, cancelar'
        }).then((result) => {
            if (result.value) {
                clearTable();
            }
        });
    }
}

/**
 * Vacia la tabla de productos.
 */
function clearTable() {
    productos = [];
    productosFinal = [];
    $("table[id='table-req'] tbody").find('input[name="record"]').each(function () {
        $(this).parents("tr").remove();
    });
    $('#observaciones').val('');
}

/**
 * Deshabilita los botones.
 */
function disableButtons() {
    $("#btnAddProd").prop("disabled", true);
    $("#btnDelProd").prop("disabled", true);
    $("#btnVaciarTabla").prop("disabled", true);
    $("#btnEnviar").prop("disabled", true);
}

/**
 * Habilita los botones.
 */
function enableButtons() {
    $("#btnAddProd").prop("disabled", false);
    $("#btnDelProd").prop("disabled", false);
    $("#btnVaciarTabla").prop("disabled", false);
    $("#btnEnviar").prop("disabled", false);
}

/**
 * Regresa un string con una fecha en el formato solicitado.
 * @param {Number} type 0: YY-MM-DD | Otro: YYMMDD
 * @param {Date} now La fecha a procesar.
 */
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

/**
 * Guarda de manera local una requisición.
 */
function guardarRequisicion() {
    if (productos.length !== 0) {
        let req = localStorage.getItem('requisicion');
        //let req_comment = localStorage.getItem('requisicion_comment');
        let productos = getListaProductos();
        if (req !== '' && req !== null) {
            Swal.fire({
                type: 'question',
                titleText: 'Aviso',
                text: 'Existe una requisición almacenada. ¿Desea sobreescribirla?',
                showCancelButton: true,
                confirmButtonText: 'Sí',
                cancelButtonText: 'No',
                allowOutsideClick: false
            }).then((result) => {
                if (result.value) {
                    console.log('requisicion sobreescrita');
                    localStorage.setItem('requisicion', JSON.stringify(productos));
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Requisición guardada.',
                        showConfirmButton: false,
                        timer: 1500
                    });
                    localStorage.setItem('requisicion_comment', $('#observaciones').val());
                }
            });
        } else {
            console.log('requisicion guardada');
            localStorage.setItem('requisicion', JSON.stringify(productos));
            Swal.fire({
                position: 'top-end',
                type: 'success',
                title: 'Requisición guardada.',
                showConfirmButton: false,
                timer: 1500
            });
            localStorage.setItem('requisicion_comment', $('#observaciones').val());
        }
    } else {
        showNotification_v1('info', 'Aviso', 'No puede guardar requisiciones sin productos');
    }
}

/**
 * Carga una requisicion almacenada localmente.
 */
function cargaRequisicion() {
    let req = localStorage.getItem('requisicion');
    if (req !== "" && req !== null) {
        let lista = JSON.parse(localStorage.getItem('requisicion'));
        if (productos.length !== 0) {
            Swal.fire({
                type: 'question',
                titleText: 'Aviso',
                text: 'Los productos en la tabla actual se perderan. ¿Desea continuar?',
                showCancelButton: true,
                confirmButtonText: 'Sí',
                cancelButtonText: 'No',
                allowOutsideClick: false
            }).then((result) => {
                if (result.value) {
                    rellenarTabla(lista);
                    $('#observaciones').val(localStorage.getItem('requisicion_comment'));
                }
            });
        } else {
            rellenarTabla(lista);
            $('#observaciones').val(localStorage.getItem('requisicion_comment'));
        }
    } else {
        Swal.fire({
            position: 'top-end',
            type: 'info',
            title: 'No hay requisición para cargar.',
            showConfirmButton: false,
            timer: 1500
        });
    }
}

/**
 * Obtiene la lista de productos almacenados en la tabla.
 */
function getListaProductos() {
    let lista = [];
    $("table[id='table-req'] tbody").find('input[name="record"]').each(function () {
        let productID = $(this).parents("tr").find('input[name="productID"]').val();
        let product = $(this).parents("tr")[0].cells[2].innerText;
        let cant = $(this).parents("tr").find('input[name="cantidad"]').val();
        let uniMed = $(this).parents("tr")[0].cells[4].innerText;
        let marcaSug = $(this).parents("tr")[0].cells[5].innerText;

        product = product.replace(/"/g, '#');

        lista.push({
            product_id: productID,
            product: product,
            cant: cant,
            uniMed: uniMed,
            marcaSug: marcaSug
        });
    });
    return lista;
}

/**
 * Llena la tabla con los productos almacenados en la lista
 */
function rellenarTabla(lista) {
    clearTable();
    let len = lista.length;
    for (let i = 0; i < len; i++) {
        let product_name = lista[i].product.replace('#', '"');
        productos.push([product_name]);
        let markup = "<tr><td><input type='checkbox' name='record'></td><td style='display:none;'><input type='number' name='productID' value='" + lista[i].product_id + "' ></td><td>" + product_name + "</td><td>" + "<input type='number' class='inputCant' name='cantidad' value='" + lista[i].cant + "'>" + "</td><td>" + lista[i].uniMed + "</td><td contenteditable='true'>" + lista[i].marcaSug + "</td></tr>";
        $("table[id='table-req'] tbody").append(markup);
    }
}

export default class Requisicion extends React.Component {
    constructor(props) {
        super(props);
        setSelect2();
    }

    componentDidMount() {
        //cargarInsumosSugeridos();
    }

    render() {
        clearTable();
        disableButtons();
        fecha = getDateString();
        getSolicitante();
        getSucursal();
        getIngredientes();
        //getEmpleados();

        return (
            <div>
                <div>
                    <div className="row">
                        <div className="col-sm-3">
                            <img src="url logo" alt="imagen" id='logoRequisicion' className="img-thumbnail img-responsive center-block" />
                        </div>
                        <div className="col-sm-9" id="headRequisicion">
                            <h2>Requisición</h2>
                            <h2>Fecha: {fecha}</h2>
                        </div>
                    </div>
                    <br />
                    <div className="row">
                        <div className="col-sm-7">
                            <select className='form-control select2' id='selectIngredients'></select>
                        </div>
                        <div className="col-sm-5" id="div-req-btns">
                            <button className="btn btn-green" id="btnAddProd" onClick={addIngredient}>Agregar</button>
                            <button className="btn btn-default" id="btnSave" onClick={guardarRequisicion}>💾 Guardar</button>
                            <button className="btn btn-default" id="btnLoad" onClick={cargaRequisicion}>📥 Cargar</button>
                        </div>
                    </div>
                    <br />
                    <div className="row scrollable-requisicion">
                        <div className="col-sm-12">
                            <table id="table-req">
                                <thead>
                                    <tr>
                                        <th>*</th>
                                        <th>Producto</th>
                                        <th>Cant</th>
                                        <th>Unidad de medida</th>
                                        <th>Marca sugerida</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                    <br />
                    <div className="row">
                        <div className="col-sm-12">
                            <button className="btn btn-danger" id="btnDelProd" onClick={deleteIngredient}>Quitar producto(s)</button>
                            <button className="btn btn-danger" id="btnVaciarTabla" onClick={vaciarTabla}>Vaciar tabla</button>
                            <p>Observaciones</p>
                            <textarea id="observaciones" rows="2" cols="70"></textarea>
                            <button className="btn btn-green" id="btnEnviar" onClick={enviarRequisicion}>Enviar requisición</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

