import '../css/main.less';

// Required for work on iOS 9b
import 'babel-polyfill';

import App from '../../main/app/app';

class PosterApp extends React.Component {
    render() {
        return <App />;
    }
}

ReactDOM.render(
    <PosterApp />,
    document.getElementById('app-container'),
);
