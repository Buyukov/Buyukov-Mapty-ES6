'use strict';




// Geolocation Aniqlash Google Map bilan
// if(navigator.geolocation) {
// navigator.geolocation.getCurrentPosition(
//     position => { 
//         const { latitude, longitude } = position.coords
//       console.log(`https://www.google.com/maps/@${latitude},${longitude},14.16z`);
//     },
//     () => alert('Could not get your position')
// );
// };
// Geolocation with leafletjs.com
//-------------------------------------------------------------------------------------

class Workout {
    date = new Date();
    id = Date.now() + ''.slice(-10);

    constructor(coords, distance, duration){
       this.coords = coords; // [lat, Lng]
       this.distance = distance; // in km
       this.duration = duration; // in min
    }

    _setDescription(){
    // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
};

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadance){ 
    super(coords, distance, duration);
    this.cadance = cadance
    this._calcPace();
    this._setDescription()
    }

    _calcPace(){
        //min / km
    this.pace = this.duration / this.distance;
    return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this._calcSpeed();
        this._setDescription();
    }

    _calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}


class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 20;
     #form = document.querySelector('.form');
 #containerWorkouts = document.querySelector('.workouts');
 #inputType = document.querySelector('.form__input--type');
 #inputDistance = document.querySelector('.form__input--distance');
 #inputDuration = document.querySelector('.form__input--duration');
 #inputCadence = document.querySelector('.form__input--cadence');
 #inputElevation = document.querySelector('.form__input--elevation');

    constructor(){
        //Get user's position
       this._getposition();
        
       //Get data from local storage
       this._geLocalStorage();

       // Attach
       this.#form.addEventListener('submit', this._newWorkout.bind(this)); 
       // Inputni Typeni O'zgartirish
       this.#inputType.addEventListener('change', this._toggleElevationField.bind(this)); 
       this.#containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    };

    _getposition(){
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => alert('Could not get your position'));
        };
    };

    _loadMap(position){
            const { latitude, longitude } = position.coords;
                const coords = [latitude, longitude];

             this.#map = L.map('map').setView([40.108459, 67.822049], 20); // [40.108459, 67.822049] Jizzakh Coordinates

                // L.tileLayer Mapning tashqi ko'rinishi theme siga tavob beradi va biz mapning Themesini bemalol boshqasiga o'zgartirsak bo'ladi
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);
              
            this.#map.on('click', this._showForm.bind(this));

            this.#workouts.forEach(workout => {
                this._renderWorkoutMarker(workout);
               });
    };

    _showForm(mapE){
        this.#mapEvent = mapE; 
        this.#form.classList.remove('hidden');
        this.#inputDistance.focus();
    };

    _hideForm(){
        // Empty inputs
        this.#inputDistance.value = this.#inputCadence.value = this.#inputDuration.value = this.#inputElevation.value = '';

        //Hide form
        this.#form.style.display = 'none';
        this.#form.classList.add('hidden');
        setTimeout(() => this.#form.style.display = 'grid', 1000);
    };
  
    _toggleElevationField(){
            this.#inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
            this.#inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    };

    _newWorkout(e){
            e.preventDefault();
            const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
            const allPositive = (...inputs) => inputs.every(input => input > 0);

            //Get data from form
                const {lat, lng} = this.#mapEvent.latlng;
                const type = this.#inputType.value;
                const distance = +this.#inputDistance.value;
                const duration = +this.#inputDuration.value;
                let workout;

            //If workout running, create running object 
            if(type === 'running') {
                const cadance = +this.#inputCadence.value;

                //check if data is valid
                if(
                    !validInputs(distance, duration, cadance) ||
                    !allPositive(distance, duration, cadance) 
                ) {
                    return alert('Please provide valid value');
              }

                workout = new Running([lat, lng], distance, duration, cadance);
            }


            //If workout cycling, create cycling object
            if(type === 'cycling') {
                const elevation = +this.#inputElevation.value;

                if(
                    !validInputs(distance, duration, elevation) || 
                    !allPositive(distance, duration)
                ) {
                    return alert('Please provide valid value');
                }

                workout = new Cycling([lat, lng], distance, duration, elevation);
            };


            //Add new objcet to workouts array
                this.#workouts.push(workout);
                // console.log(this.#workouts);


            //Render workout on a map as marker
                this._renderWorkoutMarker(workout)
         

            //Render workout on list
                this._renderWorkout(workout);
            

            //Hide form + clear input fields
                this._hideForm();


            // Set Local storage to all workouts
                this._setLocalStorage();

    };

    _renderWorkoutMarker(workout){
      // L.marker qayerda joylashib turganimizning ko'k iconiga javob beradi
      L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup({
          maxWidth: 350,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`
      })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚲'} ${workout.description}`)
      .openPopup();
    };

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
           <h2 class="workout__title">${workout.description}</h2>
           <div class="workout__details">
               <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚲'}</span>
               <span class="workout__value">${workout.distance}</span>
               <span class="workout__unit">km</span>
           </div>
           <div class="workout__details">
               <span class="workout__icon">⏱</span>
               <span class="workout__value">${workout.duration}</span>
               <span class="workout__unit">min</span>
           </div>
        `;


        if(workout.type === 'running') {
            html += `          
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadance}</span>
            <span class="workout__unit">spm</span>
            </div>
          </li>`
    }; // toFixed verguldan so'ng nechta raqam yozilishi kiritiladi 

        
        if(workout.type === 'cycling') {
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
            </div>
        </li>`
    };

        this.#form.insertAdjacentHTML('afterend', html);
    };

    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');
        
        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 3
            },
        });
    };

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // JSON.stringify Objectni string holatiga o'zgartiradi
    }; // Application LocalStoragega saqlash Ya'ni browser hotirasiga saqlash

    _geLocalStorage(){
       const data = JSON.parse(localStorage.getItem('workouts')); // JSON.parse Stringni Objcetga aylantiradi

       //Guard clausing
       if(!data) return;

       this.#workouts = data;

       this.#workouts.forEach(workout => {
        this._renderWorkout(workout);
       });
    };

    reset(){
        localStorage.removeItem('workouts')
        location.reload()
    };
};

const app = new App();
// app.reset();             




















