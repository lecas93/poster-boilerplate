import './style.css';
import { showNotification_v1 } from '../util/notifications';
import { toFixedTrunc } from '../util/number_format';

let data;
let lonas;
let gramos;

let lonas_sel;

let categorias_especificas = [
    //14, // Lonas
    //118, // Promociones de temporada
    //29, //pruebas debug
    123,
    124
];

/**
 * Obtiene y muestra las categorias especificas.
 */
function getCategories() {
    Poster.makeApiRequest('menu.getCategories', {
        method: 'get'
    }, (categories) => {
        console.log('categorias:', categories);
        if (categories) {
            let select = document.getElementById('selectCategories');
            while (select.firstChild) select.removeChild(select.firstChild);
            let length = categories.length;
            for (let i = 0; i < length; i++) {
                if (categorias_especificas.includes(Number(categories[i].category_id))) {
                    let opt = document.createElement('option');
                    opt.value = categories[i].category_id;
                    opt.innerHTML = categories[i].category_name;
                    select.appendChild(opt);
                }
            }
            updateProductList();
        }
    });
}

/**
 * Actualiza la lista de productos a desplegar.
 */
function updateProductList() {
    $('select[id=selectProducts]').prop('disabled', true);
    let categoryId = $('select[id=selectCategories] option:selected').val();
    //console.log('categoria solicitada: ', categoryId);
    Poster.makeApiRequest('menu.getProducts?category_id=' + categoryId + '&type=batchtickets', {
        method: 'get'
    }, (products) => {
        lonas = products;
        //console.log('products:', products);
        //console.log(products[142].price[1]);
        if (products) {
            let select = document.getElementById('selectProducts');
            while (select.firstChild) select.removeChild(select.firstChild);
            let length = products.length;
            for (let i = 0; i < length; i++) {
                // Solo cargamos por ahora Lona Gran Formato
                if (true/*products[i].product_name.includes('Lona Gran Formato')*/) {
                    let opt = document.createElement('option');
                    opt.value = i; /*products[i].product_id;*/
                    opt.innerHTML = products[i].product_name;
                    select.appendChild(opt);
                }
                //let opt = document.createElement('option');
                //opt.value = i; /*products[i].product_id;*/
                //opt.innerHTML = products[i].product_name;
                //select.appendChild(opt);
            }
        }
        $('select[id=selectProducts]').prop('disabled', false);
        calcularPrecio();
    });
}

/**
 * Calcula el precio con base a los inputs proporcionados.
 */
function calcularPrecio() {
    if ($('select[id=selectProducts] option:selected').val() === undefined) return;

    console.log('lonas:', lonas[$('select[id=selectProducts] option:selected').val()]);

    let precioBase = lonas[$('select[id=selectProducts] option:selected').val()].price[Poster.settings.spotId] / 10;
    let areaLona = $('#inputBase').val() * $('#inputAltura').val();
    gramos = (areaLona * 1000) / 10000;
    let precio = areaLona * precioBase;
    precio /= 10000;
    //areaLona *= precioBase;
    //areaLona /= 10000;
    $('#inputPrecio').val(toFixedTrunc(precio * $('#inputCantidad').val(), 2));
    //console.log(areaLona);
    //console.log('gramos: ', gramos);
}

/**
 * Agrega una lona a la tabla.
 */
function agregarLona() {
    if ($('select[id=selectProducts] option:selected').val() === undefined || gramos < 1) return;

    let product_id = lonas[$('select[id=selectProducts] option:selected').val()].product_id;

    let cantidad = $('#inputCantidad').val();
    let producto = $('select[id=selectProducts] option:selected').text();

    let count = gramos * cantidad;

    let archivo_relacionado = $('#inputArchivo').val().trim();

    /*if (count < 1000) {
        showNotification_v1('info', 'Aviso', 'La venta mínima para LONA GRAN FORMATO debe ser de al menos un metro cuadrado');
        return;
    }*/
    /*
    if(count < 250){
        showNotification_v1('info', 'Notificación', '');
    }*/

    lonas_sel.push([product_id, cantidad, producto, $('#inputBase').val(), $('#inputAltura').val(), localStorage.getItem('asesor_activo'), localStorage.getItem('sucursal_local'), count, archivo_relacionado]);
    localStorage.setItem('lonas_' + data.order.orderName, JSON.stringify(lonas_sel));
    console.log(lonas_sel);

    let markup = "<tr><td><input type='radio' name='record'></td>";
    markup += "<td hidden>" + product_id + "</td>";
    markup += "<td>" + cantidad + "</td>";
    markup += "<td>" + producto + "</td>";
    markup += "<td>" + $("#inputBase").val() + "</td>";
    markup += "<td>" + $("#inputAltura").val() + "</td>";
    markup += "<td>" + count + "</td>";
    markup += "<td>" + archivo_relacionado + "</td>";
    markup += "</tr>";

    $("table[id='table-lonas'] tbody").prepend(markup);

    Poster.orders.addProduct(data.order.id, { id: product_id });
    Poster.orders.getActive()
        .then(function (order) {
            //console.log(order.order.products);
            let products = order.order.products;
            for (let p in order.order.products) {
                if (products[p].id === Number(product_id)) {
                    Poster.orders.changeProductCount(data.order.id, { id: product_id, count: (products[p].count + count) - 1 });
                    return;
                }
            }
        });
    
        $('#inputArchivo').val('');
}

/**
 * Elimina un producto de la tabla.
 */
function deleteProduct() {
    $("table[id='table-lonas'] tbody").find('input[name="record"]').each(async function () {
        if ($(this).is(":checked")) {
            console.log('BORRANDO');
            // buscamos y eliminamos el producto en el array
            //console.log($(this).parents("tr")[0].cells);
            let cantidad = $(this).parents("tr")[0].cells[2].innerText;
            let producto = $(this).parents("tr")[0].cells[3].innerText;
            let base = $(this).parents("tr")[0].cells[4].innerText;
            let altura = $(this).parents("tr")[0].cells[5].innerText;

            let length = lonas_sel.length;
            for (let i = 0; i < length; i++) {
                let match = lonas_sel[i][1] === cantidad && lonas_sel[i][2] === producto && lonas_sel[i][3] === base && lonas_sel[i][4] === altura;
                if (match) {
                    console.log("producto eliminado: ", producto);
                    //await updateProduct(lonas_sel[i][0], lonas_sel[i][7]);
                    let id = lonas_sel[i][0];
                    let count = lonas_sel[i][7];

                    Poster.orders.getActive()
                        .then(function (order) {
                            //console.log(order.order.products);
                            let products = order.order.products;
                            for (let p in order.order.products) {
                                if (products[p].id === Number(id)) {
                                    let current_count = products[p].count;
                                    Poster.orders.changeProductCount(data.order.id, { id: id, count: current_count - count })
                                }
                            }
                        });

                    lonas_sel.splice(i, 1);
                    break;
                }
            }

            $(this).parents("tr").remove();
        }
    });
    console.log("productos: ", lonas_sel);
    localStorage.setItem('lonas_' + data.order.orderName, JSON.stringify(lonas_sel));
    //console.log(JSON.parse(localStorage.getItem('lonas')));
}

/**
 * Llena la tabla con los productos almacenados en la lista
 */
function rellenarTabla(lista) {
    clearTable();
    console.log('lista para rellenar', lista);
    let len = lista.length;
    for (let i = 0; i < len; i++) {
        let markup = "<tr><td><input type='radio' name='record'></td>";
        markup += "<td hidden>" + lista[i][0] + "</td>";
        markup += "<td>" + lista[i][1] + "</td>";
        markup += "<td>" + lista[i][2] + "</td>";
        markup += "<td>" + lista[i][3] + "</td>";
        markup += "<td>" + lista[i][4] + "</td>";
        markup += "<td>" + lista[i][7] + "</td>";
        markup += "<td>" + lista[i][8] + "</td>";
        markup += "</tr>";
        $("table[id='table-lonas'] tbody").append(markup);
    }
}

/**
 * Vacia la tabla.
 */
function clearTable() {
    $("table[id='table-lonas'] tbody").find('input[name="record"]').each(function () {
        $(this).parents("tr").remove();
    });
}

function init() {
    $('#inputBase').val('');
    $('#inputAltura').val('');
    $('#inputCantidad').val('1');
}

export default class VentaLonas extends React.Component {
    constructor(props) {
        super(props);

        /*Poster.on('afterPopupClosed', () => {
            localStorage.setItem('ultimaUbicacion', 'VentaLonas');
        });*/
    }

    componentDidMount() {
        rellenarTabla(lonas_sel);
    }

    render() {
        localStorage.setItem('ultimaUbicacion', 'VentaLonas');
        data = this.props.data;
        console.log('data from venta lonas: ', data);
        init();
        getCategories();
        if (localStorage.getItem('lonas_' + data.order.orderName) !== '' && localStorage.getItem('lonas_' + data.order.orderName) !== null) {
            lonas_sel = JSON.parse(localStorage.getItem('lonas_' + data.order.orderName));
        } else {
            lonas_sel = [];
        }
        console.log(lonas_sel);
        return (
            <div>
                <div className="row">
                    <div className="col-sm-7 contenedor">
                        <h1 id="lonas_title">Cotizador de Lonas</h1>
                        <div id="divCategories">
                            <p className="texto">Categoría:</p>
                            <select className="form-control texto" onChange={updateProductList} id='selectCategories'></select>
                        </div>
                        <div className="modificadores">
                            <select className="form-control texto" onChange={calcularPrecio} id='selectProducts'></select>
                        </div>
                        <div className="modificadores">
                            <div className="input-group">
                                <span className="input-group-addon">Base</span>
                                <input type="number" className="form-control" onKeyUp={calcularPrecio} onChange={calcularPrecio} id="inputBase" />
                                <span className="input-group-addon">cm</span>
                            </div>
                        </div>
                        <div className="modificadores">
                            <div className="input-group">
                                <span className="input-group-addon">Altura</span>
                                <input type="number" className="form-control" onKeyUp={calcularPrecio} onChange={calcularPrecio} id="inputAltura" />
                                <span className="input-group-addon">cm</span>
                            </div>
                        </div>
                        <div className="modificadores">
                            <div className="input-group">
                                <span className="input-group-addon">Cantidad</span>
                                <input type="number" className="form-control" defaultValue="1" onKeyUp={calcularPrecio} onChange={calcularPrecio} id="inputCantidad" />
                            </div>
                        </div>
                        <div className="modificadores">
                            <div className="input-group">
                                <input type="text" className="form-control" placeholder="Archivo relacionado" id="inputArchivo" />
                            </div>
                        </div>
                        <div>
                            <p className="texto">Precio:</p>
                            <div className="input-group">
                                <span className="input-group-addon">$</span>
                                <input type="number" className="form-control" id="inputPrecio" defaultValue="0" readOnly />
                            </div>
                        </div>
                        <div id="botonesLonas">
                            <button className="btn btn-success texto" id="btnAddLona" onClick={agregarLona}>Agregar</button>
                            <button className="btn btn-danger texto" id="btnDeleteProduct" onClick={deleteProduct}>Eliminar</button>
                            <button className="btn btn-default texto" id="btnSalirLona" onClick={Poster.interface.closePopup}>Cerrar</button>
                        </div>
                    </div>
                    <div className="col-sm-5">
                        <img src="url logo" alt="imagen" className="img-circle img-responsive center-block" />
                    </div>
                </div>
                <div className="row scrollable-lonas">
                    <div className="col-sm-12">
                        <table id="table-lonas">
                            <thead>
                                <tr>
                                    <th>*</th>
                                    <th hidden>ID</th>
                                    <th>Cant</th>
                                    <th>Lona</th>
                                    <th>Base</th>
                                    <th>Altura</th>
                                    <th>Count</th>
                                    <th>Archivo</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
}