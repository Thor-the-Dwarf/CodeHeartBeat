public class ObjekteUndReferenzen {
    static class Person {
        String name;

        public Person(String name) {
            this.name = name;
        }
    }

    public static void main(String[] args) {
        Person ersteReferenz = new Person("Ada");
        Person zweiteReferenz = ersteReferenz;
        zweiteReferenz.name = "Grace";

        System.out.println("Erste Referenz sieht: " + ersteReferenz.name);
    }
}
