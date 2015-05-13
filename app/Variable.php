<?php namespace App;

use Illuminate\Database\Eloquent\Model;

class Variable extends Model {

	//
	public function data() {
		return $this->hasMany( 'App\DataValue', 'fk_var_id' );
	}

	public function saveData( $data ) {

		$this->data()->saveMany( $data );

	}


}
