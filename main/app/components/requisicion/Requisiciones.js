import Swal from 'sweetalert2';

var bg = ["#FF1515","#FF8000","#FFE20A","#2D882D"];

function getPendingRequisitions(startDate = getMonthDate(0), endDate = getMonthDate(1)) {

    var data = {
        'sucursal': Poster.settings.spotId,
        'start': startDate,
        'end': endDate
    };

    console.log(data);

    $.ajax({
        type: 'POST',
        url: 'url/Requisiciones/get_sucursal_pending_requisitions',
        data: data,
        dataType: 'json',
        encode: true
    })
    .done(function (data) { showPendingRequisitions(data)});
}

function showPendingRequisitions(data) {
    let tBody = document.getElementById("requisitionsBody");
    tBody.innerHTML = "";
    let authorizeButton = document.getElementById("btnAutorizar");
    authorizeButton.style.visibility = "hidden";

    if (data.status == 1) {
        showRequisitions(data.requisiciones,tBody)
    } else {
        showNoResult("No se encontraron requisiciones segun los criterios de busqueda");
    }
}

function showRequisitions(requisiciones,table) {
    let numeroRequisiciones = requisiciones.length;
    let requisicion, tr, authorize = false, unauthorizedRequisitions = [];
    
    for (let i = 0; i < numeroRequisiciones; i++) {
        requisicion = requisiciones[i];

        tr = createRequisitionRow (requisicion);
        table.appendChild(tr);

        if (tr.status == -1) {
            authorize = true;
            unauthorizedRequisitions.push(tr.id);
        }
    }

    // TODO agregar boton para autorizar todas las requisiciones
    if (authorize){
        let authorizeButton = document.getElementById("btnAutorizar");
        authorizeButton.style.visibility = "visible";

        authorizeButton.onclick = function(event) { authorizeRequisitions(unauthorizedRequisitions,event.target); }
    }
}

function showNoResult (message){
    Swal.fire({
        title: 'Sin resultados',
        text: message,
        type: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
    });
}

function showSuccess (message){
    Swal.fire({
        title: 'Exito',
        text: message,
        type: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
    });
}

function createRequisitionRow (requisicion) {
    let tr = document.createElement("tr");
    tr.id = requisicion.id;
    tr.status = requisicion.status;
    
    let status = document.createElement("td");
    if (requisicion.status != -1) {
        status.setAttribute("style", "background-color: "+ bg[requisicion.status] +";");
    }
    
    let id = document.createElement("td");
    id.innerHTML = requisicion.id;
    
    let fecha = document.createElement("td");
    fecha.innerHTML = requisicion.fecha;
    
    let solicitante = document.createElement("td");
    solicitante.innerHTML = requisicion.solicitante;
    
    let acciones = document.createElement("td");
    let button = document.createElement('button');
    button.className = "btn btn-primary";
    button.setAttribute("type", "button");
    button.onclick = function() { getRequisitionDetails(requisicion.id) };
    button.innerText = "Ver Detalles";
    acciones.appendChild(button);

    if (requisicion.status == -1) {
        let authButton = document.createElement('button');
        authButton.className = "btn btn-secondary";
        authButton.onclick = function() { authorizeRequisition(requisicion.id, authButton) };
        authButton.innerText = "Autorizar";
        acciones.appendChild(authButton);
    }
    
    tr.appendChild(status);
    tr.appendChild(id);
    tr.appendChild(fecha);
    tr.appendChild(solicitante);
    tr.appendChild(acciones);
    
    return tr;
}

function authorizeRequisition (id,button) {
    var data = {
        'requisicion': id
    };

    $.ajax({
        type: 'POST',
        url: 'url/Requisiciones/authorize_requisition',
        data: data,
        dataType: 'json',
        encode: true
    })
    .done(function (data) {

        if (data.status == 1) {
            showSuccess(data.message);
            button.remove();
        } else {
            showNoResult(data.message);
        }
    })
}

function authorizeRequisitions (requisitions,button) {
    var data = {
        'requisiciones': requisitions,
        'solicitante' : localStorage.getItem("asesor_activo"),
        'sucursal' : Poster.settings.spotId
    };

    console.log(data);

    $.ajax({
        type: 'POST',
        url: 'url/Requisiciones/authorize_requisitions',
        data: data,
        dataType: 'json',
        encode: true
    })
    .done(function (data) {

        if (data.status == 1) {
            button.remove();
            showSuccess(data.message);
            let start = document.getElementById('filterStartDate').value;
            let end = document.getElementById('filterEndDate').value;

            getPendingRequisitions(start,end);
        } else {
            showNoResult(data.message);
        }
    })
}

function getRequisitionDetails (requisition) {
    var data = {
        'id': requisition
    };

    $.ajax({
        type: 'GET',
        url: 'url/Requisiciones/get_requisition_details',
        data: data,
        dataType: 'json',
        encode: true
    })
    .done(function (data) { showRequisitionDetails(data)})
}

function showRequisitionDetails(details) {
    //console.log(details);
    let requisitionBody = document.getElementById("requisitionBody");
    requisitionBody.innerHTML = "";
    let deliveriesBody = document.getElementById("deliveriesBody");
    deliveriesBody.innerHTML = "";

    if (details.status == 1) {
        showRequisition(details.requisicion,requisitionBody);
        showShippings(details.requisicion.envios, deliveriesBody);
        goToRequisitionView();
    } else {
        showNoResult("No se pudo obtener la informacion asociada a la requisicion intenete mas tarde");
    }
}

// Combinar con showShippings (anadir el campo de funcion para crear el elemento)
// algo asi como un callback pero en este caso sera la funcion especifica que
// regrese el tr
function showRequisition (requisicion, table) {
    let productos = requisicion.productos;
    let numeroProductos = productos.length;
    let producto, tr;
    
    for (let i = 0; i < numeroProductos; i++) {
        producto = productos[i];

        tr = createRequisitionProduct (producto);
        table.appendChild(tr);
    }

    // crear la fila de las observaciones
    if (requisicion.observaciones != "") {
        producto = {
            product: requisicion.observaciones,
            cant: 1,
            unimed: "p",
            marcaSug: "...",
            enCamino: 0,
            entregado: 0,
            status: 0
        };
    
        let entregado = requisicion.observaciones.split("_");
        entregado = entregado[entregado.length-1];
        if (entregado == "entregado") {
            producto.entregado = 1;
            producto.status = 1;
        }
        if (requisicion.comentarios != "") {
            producto.enCamino = 1;
        }
    
        tr = createRequisitionProduct (producto);
        table.appendChild(tr);
    }
}

function createRequisitionProduct (product) {
    let tr = document.createElement("tr");
        
    let producto = document.createElement("td");
    producto.innerHTML = product.product;
    
    let cantidad = document.createElement("td");
    cantidad.innerText = product.cant + " " + product.unimed;
    
    let marca = document.createElement("td");
    marca.innerText = product.marcaSug;
    
    let completado = document.createElement("td");
    let porcentaje = getProductDeliverRate(product.entregado,product.cant);
    completado.innerText = porcentaje + "%";
    
    let isCompleted = product.status == 1;
    let isCanceled = product.status == 2;
    
    if (isCompleted || isCanceled) {
        
        if (isCompleted) {
            if (porcentaje < 100) {
                tr.style.backgroundColor = '#FFE20A';
            } else {
                tr.style.backgroundColor = '#8cff66';
            }
        }
        
        if (isCanceled) {
            tr.style.backgroundColor = '#f7b962';
        }
    } else {
        
        if (product.enCamino > 0) {
            tr.style.backgroundColor = '#FFE20A';
        }
    }
    
    tr.appendChild(producto);
    tr.appendChild(cantidad);
    tr.appendChild(marca);
    tr.appendChild(completado);
    
    return tr;
}

function getProductDeliverRate (sended, ordered) {
    if (sended == 0) {
        return 0;
    }
    let rate = Math.floor(sended / ordered) * 100;
    return rate;
}

function showShippings (envios, table) {
    let numeroEnvios = envios.length;
    
    for (let i = 0; i < numeroEnvios; i++) {
        showShipping(envios[i], table);
    }
}

function showShipping (envio, table) {
    let productos = envio.productos;
    let numeroProductos = productos.length;
    let producto, tr;

    tr = createShippingHeader(envio.id);
    table.appendChild(tr);
    
    for (let i = 0; i < numeroProductos; i++) {
        producto = productos[i];

        tr = createShippingProduct(producto,envio.id);
        table.appendChild(tr);
    }
}

function createShippingHeader (id) {
    let tr = document.createElement("tr");

    let envio = document.createElement("td");
    envio.innerHTML = id;
        
    let producto = document.createElement("td");
    producto.innerHTML = "";
    
    let cantidad = document.createElement("td");
    cantidad.innerText = "";

    let codigo = document.createElement("td");
    codigo.innerText = "";
    
    tr.appendChild(envio);
    tr.appendChild(producto);
    tr.appendChild(cantidad);
    tr.appendChild(codigo);

    tr.style.backgroundColor = 'LightGray';
    
    return tr;
}

function createShippingProduct (product,shipping) {
    let tr = document.createElement("tr");

    let envio = document.createElement("td");
    envio.innerHTML = "";
        
    let producto = document.createElement("td");
    producto.innerHTML = product.nombre;
    
    let cantidad = document.createElement("td");
    cantidad.innerText = product.cantidad;

    let codigo = document.createElement("td");
    codigo.innerText = shipping + '-' + product.producto;

    if (product.recibido == 1) {
        tr.style.backgroundColor = '#8cff66';
    } else {
        tr.style.backgroundColor = '#FFE20A';
    }
    /*   
    let isCompleted = product.status == 1;
    let isCanceled = product.status == 2;
    
    if (isCompleted || isCanceled) {
        
        if (isCompleted) {
            if (porcentaje < 100) {
                tr.style.backgroundColor = '#FFE20A';
            } else {
                tr.style.backgroundColor = '#8cff66';
            }
        }
        
        if (isCanceled) {
            tr.style.backgroundColor = '#f7b962';
        }
    } else {
        
        if (product.enCamino > 0) {
            tr.style.backgroundColor = '#FFE20A';
        }
    }
    */
    tr.appendChild(envio);
    tr.appendChild(producto);
    tr.appendChild(cantidad);
    tr.appendChild(codigo);
    
    return tr;
}

function returnToRequisitionsView() {
    let requisitionsSection = document.getElementById("requisitions");
    requisitionsSection.style="display:initial";
    let requisitionSection = document.getElementById("requisition");
    requisitionSection.style="display:none";
}

function goToRequisitionView() {
    let requisitionsSection = document.getElementById("requisitions");
    requisitionsSection.style="display:none";
    let requisitionSection = document.getElementById("requisition");
    requisitionSection.style="display:initial";
}

// type 1 es fin de mes
// type 0 es inicion de mes
function getMonthDate(type, date = new Date()) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day;

    date = new Date(year,month,0);

    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();

    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }

    if (type == 1) {
        return year + "-" + month + "-" + day;
    } else {
        return year + "-" + month + "-01";
    }
}

function init() {
    let requisitionSection = document.getElementById("requisition");
    requisitionSection.style="display:none";

    let returnArrow = document.getElementById("return");
    returnArrow.onclick = returnToRequisitionsView;

    getPendingRequisitions();
}

export default class requisiciones extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sDate: getMonthDate(0),
            eDate: getMonthDate(1)
        }
    }

    componentDidMount() {
        init();
    }

    render() {

        return (
            <div>
                <div>
                    <section id="requisitions">
                        <div className="row">
                            <div className="col-sm-7">
                                <h2>Historial de Requisiciones</h2>
                            </div>
                            <div className="col-sm-5">
                                <ul>
                                    <div>
                                        <div className="input-color">
                                            <input readOnly value="No Atendida" />
                                            <div className="color-box" id="redBox"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="input-color">
                                            <input readOnly value="Surtida Parcialmente" />
                                            <div className="color-box" id="orangeBox"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="input-color">
                                            <input readOnly value="Surtida Completamente" />
                                            <div className="color-box" id="yellowBox"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="input-color">
                                            <input readOnly value="Surtida y Recepcionada" />
                                            <div className="color-box" id="greenBox"></div>
                                        </div>
                                    </div>
                                </ul>
                            </div>
                            <div className="row">
                                <div className="col-sm-3">
                                    <div id="startDateContainer">
                                        <label>Inicio</label>
                                        <input type="date" id="filterStartDate" value={this.state.sDate} onChange={event => {this.setState({sDate: event.target.value}); getPendingRequisitions(event.target.value,this.state.eDate)}}/>
                                    </div>
                                </div>
                                <div className="col-sm-3">
                                    <div id="endDateContainer">
                                        <label>Fin</label>
                                        <input type="date" id="filterEndDate" value={this.state.eDate} onChange={event => {this.setState({eDate: event.target.value}); getPendingRequisitions(this.state.sDate,event.target.value)}}/>
                                    </div>
                                </div>
                                <div className="col-sm-3"></div>
                                <div className="col-sm-2">
                                    <label> </label>
                                    <button className="btn btn-info" id="btnAutorizar" >Autorizar Todo</button>
                                </div>
                            </div>
                        </div>
                        <div className="row scrollable-history">
                            <div className="col-sm-12">
                                <table>
                                    <thead>
                                        <tr>
                                            <th></th>
                                            <th>Requisicion</th>
                                            <th>Fecha</th>
                                            <th>Solicitante</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="requisitionsBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                    <section id="requisition">
                        <div className="row">
                            <div className="col-sm-1">
                                <span id="return">&#8592;</span>
                            </div>
                            <div className="col-sm-9">
                                <h2 id="requisitionTitle">Requisicion</h2>
                            </div>
                        </div>
                        <br />
                        <br />
                        <div className="row scrollable-history">
                            <div className="row">
                                <div className="col-sm-9">
                                    <h3>Productos</h3>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th>Cantidad</th>
                                                <th>Marca</th>
                                                <th>Completado</th>
                                            </tr>
                                        </thead>
                                        <tbody id="requisitionBody"></tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-9">
                                    <h3>Envios</h3>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-12">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Envio</th>
                                                <th>Producto</th>
                                                <th>Cantidad</th>
                                                <th>Codigo</th>
                                            </tr>
                                        </thead>
                                        <tbody id="deliveriesBody"></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>
                    <br />
                    
                </div>
            </div>
        );
    }
}
