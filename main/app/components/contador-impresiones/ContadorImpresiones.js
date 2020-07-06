import './style.css';
import { getCurrentDate } from '../util/Util';

let fecha = null;
let datos = null;
let contenedor = null;

/**
 * Inicia el proceso para generar los inputs por cada equipo asociado a la sucursal.
 */
async function generateInputs() {
    fecha = getCurrentDate();
    $('#fecha').text(fecha);
    datos = await getDataFromServer();
    if (datos) {
        contenedor = $('#contenedor')[0];
        for (let i in datos.equipos) {
            createCardEquipo(datos.equipos[i]);
        }
    } else {
        console.error('SIN DATOS');
    }
}

/**
 * Solicita la lista de equipos asociadas a la sucursal, asi como la lista de campos para las estadisticas.
 */
function getDataFromServer() {
    return new Promise(resolve => {
        $.ajax({
            type: 'GET',
            url: 'url/Pos/contador_impresiones',
            data: {
                sucursal_id: Poster.settings.spotId
            },
            dataType: 'json',
            encoded: true
        }).done(function (result) {
            resolve(result);
        }).fail(function (xhr, textStatus, errorThrown) {
            console.error('Error al obtener datos del servidor', xhr);
            resolve(null);
        });
    });
}

/**
 * Crea la seccion del equipo proporcionado.
 * @param {*} equipo 
 */
function createCardEquipo(equipo) {
    let datos_equipo = equipo.nombre + " - " + equipo.num_serie
    let campos = equipo.campos.split(',');

    let card_equipo = createDivEquipo();
    card_equipo.appendChild(createHeader(datos_equipo));

    for (let c in campos) {
        let campo = getCampo(campos[c]);
        let label_input = createLabelInput(campo.nombre_campo);
        let input_equipo = createInputEquipo(campo.id, equipo.id, campo.type);

        card_equipo.appendChild(label_input);
        card_equipo.appendChild(input_equipo);
    }

    contenedor.appendChild(card_equipo);
}

/**
 * Devuelve el objecto campo asociado al equipo a traves de su id.
 * @param {String} id ID del campo a obtener.
 */
function getCampo(id) {
    for (let i in datos.campos) {
        if (datos.campos[i].id === id) return datos.campos[i];
    }
}

/**
 * Crea el contenedor para el equipo.
 */
function createDivEquipo() {
    let div = document.createElement('div');
    div.className = "well well-sm";
    return div;
}

/**
 * Crea el encabezado con las informacion del equipo.
 * @param {String} text 
 */
function createHeader(text) {
    let header = document.createElement('h4');
    header.innerText = text;
    return header;
}

/**
 * Crea el label identificador para el input.
 * @param {String} text 
 */
function createLabelInput(text) {
    let label = document.createElement('label');
    label.innerText = text;
    return label;
}

/**
 * Crea el input para el campo asociado al equipo.
 * @param {String} id_campo 
 * @param {String} id_equipo 
 * @param {String} type 
 */
function createInputEquipo(id_campo, id_equipo, type) {
    let input = document.createElement('input');
    input.id = id_campo;
    input.type = type;
    input.name = id_equipo;
    input.className = "form-control card-equipo";
    //input.placeholder = "Ingrese los datos correspondientes al equipo";
    return input;
}

function leerEntrada() {
    $('#contenedor').find('input').each(function () {
        console.log('id campo', $(this).attr('id')); // id del campo
        console.log('id equipo', $(this).attr('name')); // id del equipo
        console.log('value', $(this).val().trim()); // cantidad de impresiones
    });
}

export default class ContadorImpresiones extends React.Component {
    constructor(props) {
        super(props)
    }

    componentDidMount() {
        generateInputs();
    }

    render() {
        return (
            <div>
                <div className="container-fluid">
                    <div className="row col">
                        <h3 id="fecha">fecha</h3>
                    </div>
                    <div className="row  col">
                        <div className="scrollable-equipos" id="contenedor"></div>
                    </div>
                    <div className="row col">
                        <button className="btn btn-success" style={{ marginTop: '5px' }} onClick={leerEntrada}>Registrar</button>
                    </div>
                </div>
            </div>
        );
    }
}