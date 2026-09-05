public class EnumBeispiel {
    enum Ampel { ROT, GELB, GRUEN }

    public static void main(String[] args) {
        Ampel status = Ampel.GRUEN;

        switch (status) {
            case ROT -> System.out.println("Warten");
            case GELB -> System.out.println("Bereit machen");
            case GRUEN -> System.out.println("Fahren");
        }
    }
}
