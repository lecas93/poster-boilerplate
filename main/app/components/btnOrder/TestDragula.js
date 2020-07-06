import dragula from 'dragula/dragula';
import 'dragula/dist/dragula.css';
import template_panel from "../cotizacion/templates/alias-panel.html";
import Swal from 'sweetalert2';

let drake = null;
let panel_count = 0;

function calcularSubTotal(element) {
    let subtotal = 0;
    $(element).find('td[id="precio"]').each(function () {
        console.log('elementos encontrados');
        console.log($(this).text());
        subtotal += parseFloat($(this).text().replace('$', ''));
    });

    $(element).find('p[id="panel-subtotal"]').text('Sub-total: $' + subtotal.toFixed(2));
}

function addPanel() {
    let id = panel_count;
    let contenedor = $('#derecha2');

    let new_panel = template_panel;
    new_panel = new_panel.replace(/{{num}}/g, id);
    new_panel = jQuery.parseHTML(new_panel);

    contenedor.append(new_panel);
    $('#alias-btn-' + id).on('click', function () {
        removePanel(id);
    });

    drake.containers.push($('#panel-' + id)[0]);
    panel_count++;
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
                $('#izquierda2').append($(this));
            });
            $('#alias-panel-' + id).remove();
        }
    });
}

export default class TestDragula extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        //dragula([$('#izquierda2')[0], $('#derecha2')[0]], { revertOnSpill: true });
        drake = dragula({
            revertOnSpill: true,
            accepts: function (el, target, source, sibling) {
                return !$(el).hasClass('subtotal');
            }
        });

        drake.on('drop', (element, target, source, sibling) => {
            console.log('element', element);
            let precio = $(element).find('td[id="precio"]');
            console.log('precio', precio.text().replace('$', ''));
            console.log('container', target);
            console.log('source', source);
            calcularSubTotal(target);
            calcularSubTotal(source);
        });
        drake.containers.push($('#izquierda2')[0]);
        //drake.containers.push($('#derecha2')[0]);
        //drake.containers.push($('#panel1')[0]);
        //drake.containers.push($('#panel2')[0]);
    }

    render() {
        panel_count = 0;
        return (
            <div>
                <div className="container-fluid">
                    <button className="form-control btn btn-primary" onClick={addPanel}>Nuevo grupo</button>
                    <hr></hr>
                    <div className="row">
                        <div id="izquierda2" className="col-sm-6 panel panel-default panel-body">
                            <div className="well well-sm">
                                <table>
                                    <tbody>
                                        <tr><td>100</td><td>Carpetas Bond 90grs</td><td id="precio">$500.00</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="well well-sm">
                                <table>
                                    <tbody>
                                        <tr><td>100</td><td>Carpetas Bond 75grs</td><td id="precio">$100.00</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div id="derecha2" className="col-sm-6 panel panel-default panel-body">
                            {/*
                            <div id="alias-panel-0" className="panel panel-default">
                                <div className="panel-heading" style={{ display: "inline-flex", width: "100%" }}>
                                    <input className="form-control" type="text" placeholder="Escriba nuevo alias" />
                                    <button type="button" className="btn btn-default" onClick={() => { removePanel("alias-panel-0") }}>❌</button>
                                </div>
                                <div id="panel1" className="panel-body">
                                    <p id="panel-subtotal" className="subtotal">Sub-total: $0.00</p>
                                </div>
                            </div>
                            <div id="alias-panel-1" className="panel panel-default">
                                <div className="panel-heading" style={{ display: "inline-flex", width: "100%" }}>
                                    <input className="form-control" type="text" placeholder="Escriba nuevo alias" />
                                    <button type="button" className="btn btn-default" onClick={() => { removePanel("alias-panel-1") }}>❌</button>
                                </div>
                                <div id="panel2" className="panel-body">
                                    <p id="panel-subtotal" className="subtotal">Sub-total: $0.00</p>
                                </div>
                            </div>
                            */}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}